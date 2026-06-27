'use client';

export default function InfrastructurePage() {
  return (
    <div className="-mx-6 -my-8">
      <iframe
        src="/ai-infrastructure-stack.html"
        title="AI Infrastructure Stack"
        className="w-full border-none block"
        style={{ height: 'calc(100vh - 57px)' }}
      />
    </div>
  );
}
