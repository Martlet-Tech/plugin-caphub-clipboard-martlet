var history = [];

ctx.log("info", "clipboard plugin started");

// Seeded test data
history.push({ id: 1, text: "Hello CapaHub! Clipboard works.", time: "now" });
history.push({ id: 2, text: "https://github.com/Martlet-Tech/CapaHub", time: "now" });
history.push({ id: 3, text: "Ctrl+C to copy, Ctrl+Shift+V to paste", time: "now" });
var nextId = 4;

// Called when clipboard content changes
function on_clipboard_changed(text) {
    if (!text) return;
    // Ignore if same as top of history (our own paste)
    if (history.length > 0 && history[0].text === text) return;
    ctx.log("debug", "stored: " + text.substring(0, 40));
    history.unshift({ id: nextId++, text: text, time: new Date().toLocaleTimeString() });
    if (history.length > 50) history.pop();
}

// Called on Ctrl+Shift+V
function on_hotkey_show_clipboard() {
    if (history.length === 0) return;
    var draws = [];
    var y = 10;
    for (var i = 0; i < Math.min(history.length, 10); i++) {
        var entry = history[i];
        var preview = entry.text.length > 50 ? entry.text.substring(0, 50) + "..." : entry.text;
        draws.push({ type: "text", x: 10, y: y, text: preview, font_size: 14, color: 0x333333 });
        draws.push({ type: "text", x: 10, y: y + 18, text: entry.time, font_size: 11, color: 0x999999 });
        draws.push({ type: "separator", x: 10, y: y + 34, width: 380, color: 0xEEEEEE });
        draws.push({ type: "hitarea", x: 0, y: y, width: 400, height: 40, id: entry.id });
        y += 42;
    }
    ctx.commit_intent("window", JSON.stringify({
        width: 400,
        height: y + 10,
        position: "screen_center",
        auto_close: true,
        draws: draws
    }));
}

function on_clipboard_item_selected(event) {
    for (var i = 0; i < history.length; i++) {
        if (history[i].id === event.id) {
            var item = history.splice(i, 1)[0];
            history.unshift(item);
            ctx.clipboard.paste(item.text);
            return;
        }
    }
}
