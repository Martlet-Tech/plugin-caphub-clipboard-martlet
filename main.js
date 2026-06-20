var history = [];
var nextId = 1;

ctx.log("info", "clipboard plugin started");

// Load history from storage
var stored = ctx.storage.get("history");
if (stored) {
    try {
        var parsed = JSON.parse(stored);
        history = parsed.items || [];
        nextId = parsed.nextId || 1;
        ctx.log("info", "loaded " + history.length + " items from storage");
    } catch (e) {
        ctx.log("warn", "failed to parse stored history");
    }
} else {
    ctx.log("info", "no stored history, starting fresh");
}

function save_history() {
    ctx.storage.set("history", JSON.stringify({ items: history, nextId: nextId }));
}

// Called when clipboard content changes
function on_clipboard_changed(text) {
    if (!text) return;
    if (history.length > 0 && history[0].text === text) return;
    ctx.log("debug", "stored: " + text.substring(0, 40));
    history.unshift({ id: nextId++, text: text, time: new Date().toLocaleTimeString() });
    if (history.length > 50) history.pop();
    save_history();
}

// Called on Ctrl+Shift+V
function on_hotkey_show_clipboard() {
    show_picker(0);
}

function show_picker(selected_index) {
    // Lazy-load current clipboard content if history is empty
    if (history.length === 0) {
        var text = ctx.clipboard.readText();
        if (text) {
            history.unshift({ id: nextId++, text: text, time: new Date().toLocaleTimeString() });
            save_history();
        } else {
            return;
        }
    }
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
        selected_index: selected_index,
        draws: draws
    }));
}

function on_plugin_action(event) {
    if (event.plugin !== "clipboard") return;
    if (event.action === "clipboard.clear") {
        history = [];
        save_history();
        ctx.log("info", "history cleared via webview");
    }
    if (event.action === "clipboard.export") {
        var xml = export_to_xml();
        ctx.save_file_dialog(xml, "clipboard-history.xml");
        ctx.log("info", "exported " + history.length + " items");
    }
}

function export_to_xml() {
    var xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<clipboard-history>\n';
    for (var i = 0; i < history.length; i++) {
        var item = history[i];
        var text = item.text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        xml += '  <item id="' + item.id + '" time="' + item.time + '">\n';
        xml += '    <![CDATA[' + text + ']]>\n';
        xml += '  </item>\n';
    }
    xml += '</clipboard-history>\n';
    return xml;
}

function on_clipboard_item_deleted(event) {
    var idx = -1;
    for (var i = 0; i < history.length; i++) {
        if (history[i].id === event.id) {
            idx = i;
            history.splice(i, 1);
            save_history();
            ctx.log("debug", "deleted item " + event.id);
            break;
        }
    }
    // Re-open the picker with updated list, highlight same position
    if (history.length > 0) {
        show_picker(idx < history.length ? idx : history.length - 1);
    }
}

function on_clipboard_item_selected(event) {
    for (var i = 0; i < history.length; i++) {
        if (history[i].id === event.id) {
            var item = history.splice(i, 1)[0];
            history.unshift(item);
            save_history();
            ctx.clipboard.paste(item.text);
            return;
        }
    }
}
