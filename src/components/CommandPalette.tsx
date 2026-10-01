import { Search } from "lucide-react";
import { useEffect, useState } from "react";

export function CommandPalette({ onSearch }: { onSearch: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-start bg-ink-950/28 px-4 pt-[18vh] backdrop-blur-sm" onMouseDown={() => setOpen(false)}>
      <form
        className="mx-auto flex w-full max-w-xl items-center gap-3 rounded-lg border border-white/40 bg-ivory-50 p-3 shadow-lift dark:border-white/10 dark:bg-ink-900"
        onMouseDown={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault();
          onSearch(value);
          setOpen(false);
        }}
      >
        <Search className="h-5 w-5 text-ink-700/55 dark:text-ivory-100/55" />
        <input
          autoFocus
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Search listings by title or reference"
          className="h-11 flex-1 bg-transparent text-base font-semibold outline-none placeholder:text-ink-700/35 dark:text-ivory-50"
        />
      </form>
    </div>
  );
}
