/** A tap must stay still throughout; a two-pointer gesture can never become a tap. */
export class AtlasTapTracker {
  private pointers = new Map<number, {x:number;y:number;start:number;invalid:boolean}>();
  down(id:number, x:number, y:number, time:number) {
    const multiple = this.pointers.size > 0;
    if (multiple) for (const p of this.pointers.values()) p.invalid = true;
    this.pointers.set(id, {x,y,start:time,invalid:multiple});
  }
  move(id:number, x:number, y:number) {
    const p = this.pointers.get(id);
    if (p && Math.hypot(x-p.x,y-p.y) > 6) p.invalid = true;
  }
  up(id:number, x:number, y:number, time:number) {
    this.move(id,x,y);
    const p = this.pointers.get(id);
    this.pointers.delete(id);
    return !!p && !p.invalid && time-p.start < 700;
  }
  cancel(id:number) { this.pointers.delete(id); }
}
