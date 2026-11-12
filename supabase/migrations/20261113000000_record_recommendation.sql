-- =====================================================================
-- StudentStay: save an allocation recommendation in one all-or-nothing step (slice S5)
--
-- The allocation engine (TypeScript, runs on the server) works out ranked rooms and exclusions.
-- This function saves the result atomically: the run, its candidates, the held bed and the status change,
-- or nothing at all. Only the service role can call it, so a browser can never fake a recommendation.
-- Recommendation is not allocation: the application ends at pending_approval, and only decide_allocation
-- (an administrator) can approve it.
-- =====================================================================
create function record_recommendation(p_app uuid, p_rule uuid, p_explanation text, p_candidates jsonb, p_run_by uuid default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_app applications%rowtype; v_run uuid; v_top uuid; v_ranked int; v_excluded int;
begin
  if p_candidates is null or jsonb_typeof(p_candidates) <> 'array' then
    raise exception 'BAD_INPUT: candidates must be a list' using errcode = 'P0001';
  end if;
  if jsonb_array_length(p_candidates) > 400 then
    raise exception 'BAD_INPUT: too many candidates' using errcode = 'P0001';
  end if;

  select * into v_app from applications where id = p_app for update;        -- two administrators cannot match at once
  if not found then raise exception 'APPLICATION_NOT_FOUND' using errcode = 'P0002'; end if;
  if v_app.route <> 'university_allocation' then
    raise exception 'NOT_UNIVERSITY: only university allocation applications are matched' using errcode = 'P0001';
  end if;
  if v_app.status <> 'submitted' then
    raise exception 'INVALID_TRANSITION: only a submitted application can be matched (this one is %)', v_app.status using errcode = 'P0001';
  end if;
  if not exists (select 1 from allocation_rules where id = p_rule and institution_id = v_app.institution_id and active) then
    raise exception 'RULE_NOT_ACTIVE: the rule is not the active rule for this institution' using errcode = 'P0001';
  end if;

  -- Name the administrator in the history. Without this the server's own identity has no name, so the audit log,
  -- the application timeline and the bed history would show nobody, and the institution's audit log would miss the run.
  if p_run_by is not null then
    if not exists (select 1 from profiles where id = p_run_by and role = 'university_admin' and institution_id = v_app.institution_id) then
      raise exception 'NOT_ALLOWED: the person who ran the matching is not an administrator of this institution' using errcode = '42501';
    end if;
    perform set_config('request.jwt.claim.sub', p_run_by::text, true);      -- local to this one call
  end if;

  insert into allocation_runs (application_id, rule_id, run_by, explanation)
  values (p_app, p_rule, p_run_by, p_explanation) returning id into v_run;

  -- the table's own check enforces: excluded rooms have a reason, ranked rooms have a rank and a bed
  insert into allocation_candidates (run_id, room_id, bed_id, excluded, exclusion_reason, rank, score_total,
         score_room_type, score_budget, score_distance, score_facilities, score_availability, explanation)
  select v_run, (c ->> 'room_id')::uuid, nullif(c ->> 'bed_id', '')::uuid, coalesce((c ->> 'excluded')::boolean, false),
         nullif(c ->> 'exclusion_reason', ''), (c ->> 'rank')::smallint, (c ->> 'score_total')::numeric,
         (c ->> 'score_room_type')::numeric, (c ->> 'score_budget')::numeric, (c ->> 'score_distance')::numeric,
         (c ->> 'score_facilities')::numeric, (c ->> 'score_availability')::numeric, nullif(c ->> 'explanation', '')
    from jsonb_array_elements(p_candidates) c;

  select count(*) filter (where not excluded), count(*) filter (where excluded) into v_ranked, v_excluded
    from allocation_candidates where run_id = v_run;
  select bed_id into v_top from allocation_candidates where run_id = v_run and not excluded and rank = 1;

  if v_top is null then
    update applications set status = 'no_eligible_room', status_reason = 'No room matched the hard requirements' where id = p_app;
    perform _notify(v_app.student_id, 'application', 'No room matched yet',
      'We could not find a room that fits your requirements. You can change your preferences or look at private rentals.',
      '/applications/' || v_app.reference);
  else
    -- hold the top bed for this application, but only if it is still free (or already held for this application)
    perform 1 from beds where id = v_top and (state = 'available' or (state in ('held','pending_approval') and held_for_application_id = p_app)) for update;
    if not found then
      raise exception 'BED_UNAVAILABLE: the top bed was taken while matching. Run the matching again.' using errcode = 'P0001';
    end if;
    update beds set state = 'pending_approval', held_for_application_id = p_app where id = v_top and state = 'available';
    update beds set held_for_application_id = p_app where id = v_top and state = 'pending_approval';
    update applications set status = 'recommended', status_reason = null where id = p_app;
    update applications set status = 'pending_approval' where id = p_app;
    perform _notify(v_app.student_id, 'application', 'Room recommended',
      'A room matched your preferences. An administrator will review it before it becomes your allocation.',
      '/applications/' || v_app.reference);
  end if;

  perform log_audit('allocation.run', 'allocation_runs', v_run::text,
    jsonb_build_object('application', v_app.reference, 'rule', p_rule, 'ranked', v_ranked, 'excluded', v_excluded, 'run_by', p_run_by));
  return v_run;
end $$;

-- only the server (service role) may call it
revoke all on function record_recommendation(uuid, uuid, text, jsonb, uuid) from public, anon, authenticated;
grant execute on function record_recommendation(uuid, uuid, text, jsonb, uuid) to service_role;
