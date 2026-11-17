import { App, Editor, Modal, Notice, Plugin, Setting } from "obsidian";

/* ---------- утилиты ---------- */

function pad(n: number): string { return n.toString().padStart(2, "0"); }

function toLocalInput(dt: Date): string {
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}

function toTimeInput(d: Date): string { return `${pad(d.getHours())}:${pad(d.getMinutes())}`; }

function plural(n: number, one: string, few: string, many: string): string {
  const mod100 = Math.abs(n) % 100;
  const mod10 = mod100 % 10;
  if (mod100 > 10 && mod100 < 20) return many;
  if (mod10 > 1 && mod10 < 5) return few;
  if (mod10 === 1) return one;
  return many;
}

function formatDiff(d: number): string {
  // d — миллисекунды
  const ms = Math.abs(d);
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const minutes = Math.round((ms % 3600000) / 60000);
  const parts: string[] = [];
  if (days > 0) parts.push(`${days} ${plural(days, "день", "дня", "дней")}`);
  if (hours > 0 || days > 0) parts.push(`${hours} ${plural(hours, "час", "часа", "часов")}`);
  parts.push(`${minutes} ${plural(minutes, "минута", "минуты", "минут")}`);
  return parts.join(" ");
}

/* ---------- модальные окна ---------- */

abstract class InsertModal extends Modal {
  editor: Editor;
  constructor(app: App, editor: Editor) {
    super(app);
    this.editor = editor;
  }
  abstract build(): void;
  abstract result(): string | null;
  onOpen() {
    this.containerEl.addClass("timetool-modal");
    this.build();
    new Setting(this.contentEl)
      .addButton((b) =>
        b.setButtonText("Вставить").setCta().onClick(() => {
          const r = this.result();
          if (r) {
            this.editor.replaceSelection(r);
            this.close();
          } else {
            new Notice("Заполните поля");
          }
        }));
  }
}

class DiffModal extends InsertModal {
  start = toLocalInput(new Date());
  end = toLocalInput(new Date(Date.now() + 9 * 3600000));
  build() {
    this.titleEl.setText("Разница между моментами");
    new Setting(this.contentEl).setName("Начало").addText((t) =>
      t.inputEl.type = "datetime-local");
    const s1 = this.contentEl.createEl("input", { type: "datetime-local" });
    s1.value = this.start;
    s1.oninput = () => (this.start = s1.value);
    const s2 = this.contentEl.createEl("input", { type: "datetime-local" });
    s2.value = this.end;
    s2.oninput = () => (this.end = s2.value);
    s1.style.marginBottom = "8px"; s2.style.marginBottom = "8px";
    s1.style.width = "100%"; s2.style.width = "100%";
  }
  result(): string | null {
    const a = new Date(this.start), b = new Date(this.end);
    if (isNaN(a.getTime()) || isNaN(b.getTime())) return null;
    const d = b.getTime() - a.getTime();
    const days = Math.abs(d / 86400000);
    return `**Разница:** ${formatDiff(d)} (${days.toFixed(2)} ${plural(Math.round(days), "день", "дня", "дней")} / ${(Math.abs(d) / 3600000).toFixed(1)} ч)`;
  }
}

class ShiftModal extends InsertModal {
  base = toLocalInput(new Date());
  value = 14;
  unit = "days";
  sign = "+";
  build() {
    this.titleEl.setText("Сдвиг даты");
    const b = this.contentEl.createEl("input", { type: "datetime-local" });
    b.value = this.base; b.style.width = "100%"; b.style.marginBottom = "8px";
    b.oninput = () => (this.base = b.value);
    const row = this.contentEl.createDiv({ cls: "timetool-row" });
    const v = row.createEl("input", { type: "number", value: String(this.value) });
    v.style.width = "70px";
    v.oninput = () => (this.value = parseInt(v.value) || 0);
    const u = row.createEl("select");
    for (const [val, label] of [["minutes", "минуты"], ["hours", "часы"], ["days", "дни"], ["weeks", "недели"], ["months", "месяцы"], ["years", "годы"]]) {
      u.createEl("option", { text: label, value: val });
    }
    u.value = this.unit;
    u.onchange = () => (this.unit = u.value);
    const s = row.createEl("select");
    s.createEl("option", { text: "плюс (+)", value: "+" });
    s.createEl("option", { text: "минус (−)", value: "-" });
    s.value = this.sign;
    s.onchange = () => (this.sign = s.value);
  }
  result(): string | null {
    const a = new Date(this.base);
    if (isNaN(a.getTime())) return null;
    let r: Date;
    const n = this.sign === "-" ? -this.value : this.value;
    switch (this.unit) {
      case "minutes": r = new Date(a.getTime() + n * 60000); break;
      case "hours": r = new Date(a.getTime() + n * 3600000); break;
      case "weeks": r = new Date(a.getTime() + n * 7 * 86400000); break;
      case "days": r = new Date(a.getTime() + n * 86400000); break;
      case "months": r = new Date(a); r.setMonth(r.getMonth() + n); break;
      default: r = new Date(a); r.setFullYear(r.getFullYear() + n);
    }
    const fmt = (d: Date) => `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    const unitName: Record<string, string> = { minutes: "мин.", hours: "час.", days: "дн.", weeks: "нед.", months: "мес.", years: "г." };
    return `**${fmt(a)}** ${this.sign} ${this.value} ${unitName[this.unit]} = **${fmt(r)}**`;
  }
}

class UntilModal extends InsertModal {
  date = (() => { const d = new Date(); d.setDate(d.getDate() + 14); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; })();
  build() {
    this.titleEl.setText("Отсчёт до даты");
    const d = this.contentEl.createEl("input", { type: "date" });
    d.value = this.date; d.style.width = "100%"; d.style.marginBottom = "8px";
    d.oninput = () => (this.date = d.value);
  }
  result(): string | null {
    const target = new Date(this.date + "T00:00:00");
    if (isNaN(target.getTime())) return null;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const days = Math.round((target.getTime() - now.getTime()) / 86400000);
    if (days < 0) return `**До ${this.date.split("-").reverse().join(".")}:** прошло ${formatDiff(-days * 86400000)} назад`;
    return `**До ${this.date.split("-").reverse().join(".")}:** осталось ${days} ${plural(days, "день", "дня", "дней")}`;
  }
}

class IntervalsModal extends InsertModal {
  rows: { start: string; end: string }[] = [
    { start: "07:00", end: "14:00" },
    { start: "15:00", end: "18:00" },
  ];
  build() {
    this.titleEl.setText("Сумма интервалов");
    const list = this.contentEl.createDiv();
    const render = () => {
      list.empty();
      this.rows.forEach((row, i) => {
        const r = list.createDiv({ cls: "timetool-row" });
        const s = r.createEl("input", { type: "time", value: row.start });
        s.oninput = () => (row.start = s.value);
        r.createEl("span", { text: "—" });
        const e = r.createEl("input", { type: "time", value: row.end });
        e.oninput = () => (row.end = e.value);
        if (this.rows.length > 1) {
          const x = r.createEl("button", { text: "✕" });
          x.onclick = () => { this.rows.splice(i, 1); render(); };
        }
        const iv = this.intervalMs(row);
        r.createEl("span", { text: iv === null ? "—" : formatDiff(iv), cls: "timetool-hint" });
      });
    };
    const add = this.contentEl.createEl("button", { text: "＋ Добавить интервал" });
    add.onclick = () => { this.rows.push({ start: "09:00", end: "18:00" }); render(); };
    render();
  }
  intervalMs(row: { start: string; end: string }): number | null {
    const [sh, sm] = row.start.split(":").map(Number);
    const [eh, em] = row.end.split(":").map(Number);
    if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return null;
    let d = (eh * 60 + em) - (sh * 60 + sm);
    if (d < 0) d += 24 * 60;
    return d * 60000;
  }
  result(): string | null {
    const parts = this.rows.map((r) => this.intervalMs(r)).filter((x): x is number => x !== null);
    if (parts.length === 0) return null;
    const total = parts.reduce((a, b) => a + b, 0);
    return `**Сумма интервалов:** ${formatDiff(total)} (${(total / 3600000).toFixed(1)} ч)`;
  }
}

/* ---------- плагин ---------- */

export default class TimeToolPlugin extends Plugin {
  async onload() {
    this.addCommand({
      id: "diff",
      name: "Разница между моментами",
      editorCallback: (editor) => new DiffModal(this.app, editor).open(),
    });
    this.addCommand({
      id: "shift",
      name: "Сдвиг даты",
      editorCallback: (editor) => new ShiftModal(this.app, editor).open(),
    });
    this.addCommand({
      id: "until",
      name: "Отсчёт до даты",
      editorCallback: (editor) => new UntilModal(this.app, editor).open(),
    });
    this.addCommand({
      id: "intervals",
      name: "Сумма интервалов (смены)",
      editorCallback: (editor) => new IntervalsModal(this.app, editor).open(),
    });

    // живой блок:
    // ```timetool
    // type: until
    // name: Зарплата
    // date: 2026-12-25
    // time: 09:00
    // ```
    this.registerMarkdownCodeBlockProcessor("timetool", (source, el) => {
      liveRender(el, () => renderSpec(parseSpec(source)));
    });

    // inline: `timetool:until:2026-12-25` или `timetool:diff:2026-01-01,2026-12-31`
    this.registerMarkdownPostProcessor((el) => {
      for (const code of Array.from(el.querySelectorAll("code"))) {
        const text = code.textContent || "";
        if (!text.startsWith("timetool:") || code.closest("pre")) continue;
        const payload = text.slice("timetool:".length);
        const sep = payload.indexOf(":");
        const type = sep > 0 ? payload.slice(0, sep) : "until";
        const rest = sep > 0 ? payload.slice(sep + 1) : payload;
        let spec: Record<string, string> = { type };
        if (type === "until") spec.date = rest;
        else if (type === "diff") {
          const [a, b] = rest.split(",");
          spec.a = a; spec.b = b;
        } else if (type === "shift") {
          const [base, value, unit, sign] = rest.split(",");
          spec = { type, base, value, unit: unit || "days", sign: sign || "+" };
        }
        const span = document.createElement("span");
        code.parentNode?.replaceChild(span, code);
        liveRender(span, () => renderSpec(spec));
      }
    });
  }
  onunload() {}
}

/* ---------- живые код-блоки и inline ---------- */

function parseSpec(source: string): Record<string, string> {
  const r: Record<string, string> = {};
  for (const line of source.split("\n")) {
    const i = line.indexOf(":");
    if (i > 0) r[line.slice(0, i).trim().toLowerCase()] = line.slice(i + 1).trim();
  }
  return r;
}

function fmtDateTime(d: Date): string {
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function renderSpec(spec: Record<string, string>): string {
  const type = (spec.type || "until").toLowerCase();
  if (type === "clock") return fmtDateTime(new Date());
  if (type === "until") {
    const raw = (spec.date || "") + (spec.time ? "T" + spec.time : "T00:00:00");
    const target = new Date(raw);
    if (isNaN(target.getTime())) return "timetool: неверная дата";
    const now = new Date();
    const ms = target.getTime() - now.getTime();
    if (Math.abs(ms) < 60000) return `**${spec.name || "Событие"}**: сейчас!`;
    const d = new Date(now.getFullYear(), 0, 0);
    void d;
    const days = Math.floor(Math.abs(ms) / 86400000);
    const hours = Math.floor((Math.abs(ms) % 86400000) / 3600000);
    const head = spec.name ? `**${spec.name}**` : `до ${fmtDateTime(target)}`;
    return ms > 0
      ? `${head}: осталось ${days > 0 ? days + " " + plural(days, "день", "дня", "дней") + " " : ""}${hours} ${plural(hours, "час", "часа", "часов")}`
      : `${head}: прошло ${formatDiff(ms)} назад`;
  }
  if (type === "diff") {
    const a = new Date(spec.a || ""), b = new Date(spec.b || "");
    if (isNaN(a.getTime()) || isNaN(b.getTime())) return "timetool: укажите a и b (YYYY-MM-DD)";
    return `разница: ${formatDiff(b.getTime() - a.getTime())}`;
  }
  if (type === "shift") {
    const base = new Date(spec.base || "");
    if (isNaN(base.getTime())) return "timetool: укажите base";
    const value = parseInt(spec.value || "0") || 0;
    const unit = spec.unit || "days";
    const r = new Date(base);
    const n = (spec.sign === "-" ? -1 : 1) * value;
    if (unit === "months") r.setMonth(r.getMonth() + n);
    else if (unit === "years") r.setFullYear(r.getFullYear() + n);
    else {
      const mult: Record<string, number> = { minutes: 60000, hours: 3600000, days: 86400000, weeks: 604800000 };
      r.setTime(r.getTime() + n * (mult[unit] || 86400000));
    }
    return `${fmtDateTime(base)} ${spec.sign === "-" ? "−" : "+"} ${value} ${unit} = **${fmtDateTime(r)}**`;
  }
  return "timetool: неизвестный type (until/diff/shift/clock)";
}

function liveRender(el: HTMLElement, compute: () => string) {
  const target = el.createSpan({ cls: "timetool-live" });
  target.textContent = compute();
  const iv = window.setInterval(() => {
    if (!target.isConnected) { window.clearInterval(iv); return; }
    const t = compute();
    if (target.textContent !== t) target.textContent = t;
  }, 1000);
}
