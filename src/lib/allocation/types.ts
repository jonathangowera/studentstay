/**
 * Engine input and output. The input holds ONLY what the rules need (PRD FR5.6): no name, nationality, religion,
 * student number or any other personal detail. The engine never reads fields it does not declare here.
 */
import type { BedState, GenderPolicy, RoomType } from "@/lib/listings/labels";

export type HardConstraintKey = "institution_eligible" | "bed_free" | "gender_policy" | "room_type" | "budget_ceiling";

/** The order rooms are checked in. A room is excluded with the FIRST failing reason. */
export const CONSTRAINT_ORDER: readonly HardConstraintKey[] = ["institution_eligible", "bed_free", "gender_policy", "room_type", "budget_ceiling"];

export type Weights = { roomType: number; budget: number; distance: number; facilities: number; availability: number };

export type EngineRule = {
  id: string;
  name: string;
  version: number;
  weights: Weights;
  /** allocation_rules.hard_constraints as stored (json). A missing flag counts as switched on. */
  hardConstraints: unknown;
};

export type EngineApplication = {
  id: string;
  institutionCode: string;
  roomType: RoomType;
  /** Monthly budget in kwacha. */
  budget: number;
  /** "Who can stay": the gender policy the student needs. */
  gender: GenderPolicy;
  facilities: readonly string[];
};

export type EngineBed = { id: string; label: string; state: BedState; heldForApplicationId: string | null };

export type EngineListing = {
  id: string;
  name: string;
  rentUnit: string | null;
  gender: GenderPolicy | null;
  facilities: readonly string[];
  lastUpdatedAt: string;
  /** Distance to the application's institution. */
  distanceKm: number | null;
  /** Recognised (partnered) by the application's institution. */
  partnered: boolean;
};

export type EngineRoom = {
  id: string;
  number: string;
  type: RoomType;
  /** As stored: per month, or per term for hostels (listing.rentUnit). */
  price: number;
  wing: string | null;
  /** Overrides the listing policy when set. */
  gender: GenderPolicy | null;
  listing: EngineListing;
  beds: readonly EngineBed[];
};

export type EngineInput = {
  application: EngineApplication;
  rule: EngineRule;
  rooms: readonly EngineRoom[];
  /** Passed in so results are repeatable. */
  now: Date;
};

export type Scores = { roomType: number; budget: number; distance: number; facilities: number; availability: number; total: number };

export type RankedRoom = { rank: number; room: EngineRoom; bed: EngineBed; monthlyPrice: number; scores: Scores; explanation: string };

export type ExcludedRoom = { room: EngineRoom; reasonKey: HardConstraintKey; reason: string };

/** One row for record_recommendation (p_candidates). */
export type CandidateRow = {
  room_id: string;
  bed_id: string | null;
  excluded: boolean;
  exclusion_reason: string | null;
  rank: number | null;
  score_total: number | null;
  score_room_type: number | null;
  score_budget: number | null;
  score_distance: number | null;
  score_facilities: number | null;
  score_availability: number | null;
  explanation: string | null;
};

export type EngineResult = {
  ranked: RankedRoom[];
  /** Excluded rooms kept for the record, at most MAX_EXCLUDED. */
  excluded: ExcludedRoom[];
  /** All excluded rooms per reason, before the cap. */
  failCounts: Record<HardConstraintKey, number>;
  considered: number;
  /** The run explanation saved with the run. */
  explanation: string;
  candidates: CandidateRow[];
};
