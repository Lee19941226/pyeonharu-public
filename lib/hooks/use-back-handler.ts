import { useEffect, useRef } from "react";
import { pushBackHandler, removeBackHandler } from "@/lib/utils/back-stack";

/**
 * 모달/팝업/바텀시트에서 뒤로가기 닫기를 자동 등록하는 훅
 * 
 * @param isOpen - 모달이 열려있는지
 * @param onClose - 닫기 콜백
 * 
 * 사용법:
 *   useBackHandler(showModal, () => setShowModal(false));
 */
export function useBackHandler(isOpen: boolean, onClose: () => void) {
  const handlerId = useRef<number | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (isOpen) {
      // 열릴 때 스택에 등록
      handlerId.current = pushBackHandler(() => onCloseRef.current());
    } else {
      // 닫힐 때 스택에서 제거
      if (handlerId.current !== null) {
        removeBackHandler(handlerId.current);
        handlerId.current = null;
      }
    }

    return () => {
      // 언마운트 시 정리
      if (handlerId.current !== null) {
        removeBackHandler(handlerId.current);
        handlerId.current = null;
      }
    };
  }, [isOpen]);
}
