/** Touch-first (GamePigeon) vs mouse-first (Miniclip) input profile. */
export type EightBallInputMode = "touch" | "mouse";

const MOBILE_UA =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i;

export function detectEightBallInputMode(): EightBallInputMode {
  if (typeof window === "undefined") return "mouse";

  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const noHover = window.matchMedia("(hover: none)").matches;
  const touchPoints = navigator.maxTouchPoints > 0;
  const mobileUa = MOBILE_UA.test(navigator.userAgent);

  if ((coarsePointer && noHover) || (touchPoints && mobileUa)) {
    return "touch";
  }
  return "mouse";
}

export const EIGHT_BALL_MIN_POWER = 0.12;
export const EIGHT_BALL_MAX_PULL_PX = 140;

export function pullToShot(pullDx: number, pullDy: number, maxPull = EIGHT_BALL_MAX_PULL_PX) {
  const pullLen = Math.hypot(pullDx, pullDy);
  if (pullLen < 8) {
    return null;
  }
  const angle = Math.atan2(-pullDy, -pullDx);
  const power = Math.min(1, Math.max(EIGHT_BALL_MIN_POWER, pullLen / maxPull));
  return { angle, power };
}

export function aimTowardPoint(cueX: number, cueY: number, targetX: number, targetY: number) {
  return Math.atan2(targetY - cueY, targetX - cueX);
}

export function powerFromPullback(
  cueX: number,
  cueY: number,
  pointerX: number,
  pointerY: number,
  aimAngle: number,
  maxPull = EIGHT_BALL_MAX_PULL_PX,
) {
  const dx = pointerX - cueX;
  const dy = pointerY - cueY;
  const pullAlongCue = -(dx * Math.cos(aimAngle) + dy * Math.sin(aimAngle));
  if (pullAlongCue < 8) return 0;
  return Math.min(1, Math.max(EIGHT_BALL_MIN_POWER, pullAlongCue / maxPull));
}
