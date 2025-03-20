// Footer.js
export function EditorFooter({ isServerMode, isConnected }) {
    return (
      <footer className="border-t p-2 bg-background flex items-center justify-between text-xs text-muted-foreground">
        <div>
          {isServerMode
            ? isConnected
              ? "Connected to server"
              : "Disconnected from server"
            : "Local mode (no server connection)"}
        </div>
        <div>XMI Editor v1.0</div>
      </footer>
    )
  }