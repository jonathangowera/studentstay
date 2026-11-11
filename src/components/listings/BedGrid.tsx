import { Icon } from "@/components/ui/Icon";
import { bedStateInfo, ROOM_TYPE_LABEL } from "@/lib/listings/labels";
import { plural } from "@/lib/format";
import type { RoomWithBeds } from "@/server/listings";

/** Every room and its beds. Each bed shows an icon and its label; the state is spelled out for screen readers. */
export function BedGrid({ rooms }: { rooms: RoomWithBeds[] }) {
  if (!rooms.length) return <p className="muted">No rooms are listed yet.</p>;
  return (
    <ul className="bedgrid">
      {rooms.map((r) => (
        <li className="room" key={r.id}>
          <div className="room-h">
            <b>Room {r.room_number}</b>
            <small>
              {ROOM_TYPE_LABEL[r.room_type]}, {plural(r.beds.length, "bed")}
            </small>
          </div>
          <ul className="room-b" aria-label={`Beds in room ${r.room_number}`}>
            {r.beds.map((b) => {
              const s = bedStateInfo(b.state);
              return (
                <li key={b.id} className={`bed ${s.cls}`} title={`Bed ${b.label}: ${s.label}`}>
                  <Icon name={s.icon} />
                  <span aria-hidden="true">{b.label}</span>
                  <span className="sr-only">
                    Bed {b.label}, {s.label}
                  </span>
                </li>
              );
            })}
          </ul>
        </li>
      ))}
    </ul>
  );
}
