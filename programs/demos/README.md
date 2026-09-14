# BBC BASIC BOB Parade (4×4 Dot Lattice)

Reference demonstration of Blitter Objects (BOBs) operating across the sovereign 4×4 dot lattice invariant within `uCode`.

## Dot Lattice Invariants

- **Base Unit**: $1\text{ dot} = 4\times 4\text{ device pixels}$.
- **Resolution**: $80\times 50\text{ dots} = 320\times 200\text{ px}$.
- **Coordinates**: Integer dot units $(X, Y)$ where $0 \le X < 80$ and $0 \le Y < 50$.
- **Cell Mapping**:
  - Square Register: $2\times 2\text{ dots} = 8\times 8\text{ px}$.
  - Tall Register: $3\times 5\text{ dots} = 12\times 20\text{ px}$ (Teletext character cell).

## Commands

- `BOB id, x, y, frame` — Position or animate BOB instance on dot lattice.
- `BOB OFF id` — Hide BOB instance from display.
- Edge bounce and collision detection are calculated in dot coordinate space.
