import { Button } from "@/components/ui/button";
import { FileCode } from "lucide-react";

export function EditorPanel({ fileName, xmiCode, onCodeChange }) {
  return (
    <div className="h-full flex flex-col">
      <div className="border-b p-2 bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileCode className="h-4 w-4" />
          <span className="text-sm font-medium">{fileName || "Untitled"}</span>
        </div>
      </div>
      <textarea
        className="flex-1 p-4 font-mono text-sm resize-none w-full h-full focus:outline-none"
        value={xmiCode}
        onChange={onCodeChange}
        spellCheck={false}
      />
    </div>
  );
}