function norm(a: number) {
  a = a % (2 * Math.PI);
  return a < 0 ? a + 2 * Math.PI : a;
}

export const angleInArc = (angle: number, start: number, end: number) => {
  angle = norm(angle);
  start = norm(start);
  end = norm(end);

  if (start <= end) {
    return angle >= start && angle <= end;
  } else {
    return angle >= start || angle <= end;
  }
};
