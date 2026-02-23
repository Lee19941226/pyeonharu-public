export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <div className="text-6xl mb-4">📡</div>
      <h1 className="text-2xl font-bold mb-2">인터넷 연결이 없어요</h1>
      <p className="text-muted-foreground text-sm mb-6 max-w-xs">
        오프라인 상태입니다. 네트워크를 확인한 후 다시 시도해주세요.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="rounded-lg bg-primary px-6 py-3 text-sm font-medium text-white"
      >
        다시 시도
      </button>
      <p className="mt-6 text-xs text-muted-foreground">
        이전에 방문한 페이지는 오프라인에서도 볼 수 있어요
      </p>
    </div>
  );
}
