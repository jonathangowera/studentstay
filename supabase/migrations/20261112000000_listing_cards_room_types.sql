-- =====================================================================
-- StudentStay: add room types to the public listing view (for slice S3)
-- Adds two columns at the END of the view, so nothing that already uses it changes:
--   room_types       the room types the listing offers
--   free_room_types  the room types that have at least one available bed
-- =====================================================================
create or replace view listing_cards as
select l.id, l.name, l.type, l.area, l.gender, l.gender_note, l.facilities, l.rent_unit, l.verification,
       l.last_updated_at, (now() - l.last_updated_at > interval '30 days') as is_stale,
       pa.business_name as managed_by,
       min(r.price_zmw) as price_from, max(r.price_zmw) as price_to,
       count(b.id) as beds_total, count(b.id) filter (where b.state = 'available') as beds_available,
       (select coalesce(jsonb_object_agg(i.code, ld.distance_km), '{}'::jsonb)
          from listing_distances ld join institutions i on i.id = ld.institution_id where ld.listing_id = l.id) as distances,
       coalesce(array_remove(array_agg(distinct r.room_type order by r.room_type), null), '{}'::room_type[]) as room_types,
       coalesce(array_remove(array_agg(distinct r.room_type order by r.room_type) filter (where b.state = 'available'), null), '{}'::room_type[]) as free_room_types
from listings l
join partners pa on pa.id = l.partner_id
left join rooms r on r.listing_id = l.id
left join beds  b on b.room_id = r.id
where l.moderation = 'published'
group by l.id, pa.business_name;
