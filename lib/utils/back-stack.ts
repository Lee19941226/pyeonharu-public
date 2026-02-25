/**
 * 뒤로가기 스택 시스템
 * 
 * 모달/팝업/바텀시트가 열릴 때 closeHandler를 push하고,
 * Android 뒤로가기 시 가장 최근 핸들러를 pop하여 실행.
 * 스택이 비면 history.back() 또는 앱 종료 확인.
 * 
 * 사용법:
 *   // 모달 열 때
 *   const id = backStack.push(() => setOpen(false));
 *   // 모달 닫힐 때
 *   backStack.remove(id);
 */

type BackStackEntry = {
  id: number;
  close: () => void;
};

let stack: BackStackEntry[] = [];
let nextId = 1;

/** 닫기 핸들러 등록. 고유 id 반환 */
export function pushBackHandler(close: () => void): number {
  const id = nextId++;
  stack.push({ id, close });
  return id;
}

/** id로 핸들러 제거 (모달이 닫힐 때 호출) */
export function removeBackHandler(id: number): void {
  stack = stack.filter((entry) => entry.id !== id);
}

/** 스택에 핸들러가 있는지 확인 */
export function hasBackHandler(): boolean {
  return stack.length > 0;
}

/** 가장 최근 핸들러를 꺼내서 실행. 있으면 true, 없으면 false */
export function popBackHandler(): boolean {
  if (stack.length === 0) return false;
  const entry = stack.pop()!;
  entry.close();
  return true;
}
