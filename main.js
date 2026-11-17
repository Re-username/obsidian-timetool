"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// main.ts
var main_exports = {};
__export(main_exports, {
  default: () => TimeToolPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");
function pad(n) {
  return n.toString().padStart(2, "0");
}
function toLocalInput(dt) {
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}
function plural(n, one, few, many) {
  const mod100 = Math.abs(n) % 100;
  const mod10 = mod100 % 10;
  if (mod100 > 10 && mod100 < 20) return many;
  if (mod10 > 1 && mod10 < 5) return few;
  if (mod10 === 1) return one;
  return many;
}
function formatDiff(d) {
  const ms = Math.abs(d);
  const days = Math.floor(ms / 864e5);
  const hours = Math.floor(ms % 864e5 / 36e5);
  const minutes = Math.round(ms % 36e5 / 6e4);
  const parts = [];
  if (days > 0) parts.push(`${days} ${plural(days, "\u0434\u0435\u043D\u044C", "\u0434\u043D\u044F", "\u0434\u043D\u0435\u0439")}`);
  if (hours > 0 || days > 0) parts.push(`${hours} ${plural(hours, "\u0447\u0430\u0441", "\u0447\u0430\u0441\u0430", "\u0447\u0430\u0441\u043E\u0432")}`);
  parts.push(`${minutes} ${plural(minutes, "\u043C\u0438\u043D\u0443\u0442\u0430", "\u043C\u0438\u043D\u0443\u0442\u044B", "\u043C\u0438\u043D\u0443\u0442")}`);
  return parts.join(" ");
}
var InsertModal = class extends import_obsidian.Modal {
  constructor(app, editor) {
    super(app);
    this.editor = editor;
  }
  onOpen() {
    this.containerEl.addClass("timetool-modal");
    this.build();
    new import_obsidian.Setting(this.contentEl).addButton((b) => b.setButtonText("\u0412\u0441\u0442\u0430\u0432\u0438\u0442\u044C").setCta().onClick(() => {
      const r = this.result();
      if (r) {
        this.editor.replaceSelection(r);
        this.close();
      } else {
        new import_obsidian.Notice("\u0417\u0430\u043F\u043E\u043B\u043D\u0438\u0442\u0435 \u043F\u043E\u043B\u044F");
      }
    }));
  }
};
var DiffModal = class extends InsertModal {
  constructor() {
    super(...arguments);
    this.start = toLocalInput(/* @__PURE__ */ new Date());
    this.end = toLocalInput(new Date(Date.now() + 9 * 36e5));
  }
  build() {
    this.titleEl.setText("\u0420\u0430\u0437\u043D\u0438\u0446\u0430 \u043C\u0435\u0436\u0434\u0443 \u043C\u043E\u043C\u0435\u043D\u0442\u0430\u043C\u0438");
    new import_obsidian.Setting(this.contentEl).setName("\u041D\u0430\u0447\u0430\u043B\u043E").addText((t) => t.inputEl.type = "datetime-local");
    const s1 = this.contentEl.createEl("input", { type: "datetime-local" });
    s1.value = this.start;
    s1.oninput = () => this.start = s1.value;
    const s2 = this.contentEl.createEl("input", { type: "datetime-local" });
    s2.value = this.end;
    s2.oninput = () => this.end = s2.value;
    s1.style.marginBottom = "8px";
    s2.style.marginBottom = "8px";
    s1.style.width = "100%";
    s2.style.width = "100%";
  }
  result() {
    const a = new Date(this.start), b = new Date(this.end);
    if (isNaN(a.getTime()) || isNaN(b.getTime())) return null;
    const d = b.getTime() - a.getTime();
    const days = Math.abs(d / 864e5);
    return `**\u0420\u0430\u0437\u043D\u0438\u0446\u0430:** ${formatDiff(d)} (${days.toFixed(2)} ${plural(Math.round(days), "\u0434\u0435\u043D\u044C", "\u0434\u043D\u044F", "\u0434\u043D\u0435\u0439")} / ${(Math.abs(d) / 36e5).toFixed(1)} \u0447)`;
  }
};
var ShiftModal = class extends InsertModal {
  constructor() {
    super(...arguments);
    this.base = toLocalInput(/* @__PURE__ */ new Date());
    this.value = 14;
    this.unit = "days";
    this.sign = "+";
  }
  build() {
    this.titleEl.setText("\u0421\u0434\u0432\u0438\u0433 \u0434\u0430\u0442\u044B");
    const b = this.contentEl.createEl("input", { type: "datetime-local" });
    b.value = this.base;
    b.style.width = "100%";
    b.style.marginBottom = "8px";
    b.oninput = () => this.base = b.value;
    const row = this.contentEl.createDiv({ cls: "timetool-row" });
    const v = row.createEl("input", { type: "number", value: String(this.value) });
    v.style.width = "70px";
    v.oninput = () => this.value = parseInt(v.value) || 0;
    const u = row.createEl("select");
    for (const [val, label] of [["minutes", "\u043C\u0438\u043D\u0443\u0442\u044B"], ["hours", "\u0447\u0430\u0441\u044B"], ["days", "\u0434\u043D\u0438"], ["weeks", "\u043D\u0435\u0434\u0435\u043B\u0438"], ["months", "\u043C\u0435\u0441\u044F\u0446\u044B"], ["years", "\u0433\u043E\u0434\u044B"]]) {
      u.createEl("option", { text: label, value: val });
    }
    u.value = this.unit;
    u.onchange = () => this.unit = u.value;
    const s = row.createEl("select");
    s.createEl("option", { text: "\u043F\u043B\u044E\u0441 (+)", value: "+" });
    s.createEl("option", { text: "\u043C\u0438\u043D\u0443\u0441 (\u2212)", value: "-" });
    s.value = this.sign;
    s.onchange = () => this.sign = s.value;
  }
  result() {
    const a = new Date(this.base);
    if (isNaN(a.getTime())) return null;
    let r;
    const n = this.sign === "-" ? -this.value : this.value;
    switch (this.unit) {
      case "minutes":
        r = new Date(a.getTime() + n * 6e4);
        break;
      case "hours":
        r = new Date(a.getTime() + n * 36e5);
        break;
      case "weeks":
        r = new Date(a.getTime() + n * 7 * 864e5);
        break;
      case "days":
        r = new Date(a.getTime() + n * 864e5);
        break;
      case "months":
        r = new Date(a);
        r.setMonth(r.getMonth() + n);
        break;
      default:
        r = new Date(a);
        r.setFullYear(r.getFullYear() + n);
    }
    const fmt = (d) => `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    const unitName = { minutes: "\u043C\u0438\u043D.", hours: "\u0447\u0430\u0441.", days: "\u0434\u043D.", weeks: "\u043D\u0435\u0434.", months: "\u043C\u0435\u0441.", years: "\u0433." };
    return `**${fmt(a)}** ${this.sign} ${this.value} ${unitName[this.unit]} = **${fmt(r)}**`;
  }
};
var UntilModal = class extends InsertModal {
  constructor() {
    super(...arguments);
    this.date = (() => {
      const d = /* @__PURE__ */ new Date();
      d.setDate(d.getDate() + 14);
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    })();
  }
  build() {
    this.titleEl.setText("\u041E\u0442\u0441\u0447\u0451\u0442 \u0434\u043E \u0434\u0430\u0442\u044B");
    const d = this.contentEl.createEl("input", { type: "date" });
    d.value = this.date;
    d.style.width = "100%";
    d.style.marginBottom = "8px";
    d.oninput = () => this.date = d.value;
  }
  result() {
    const target = /* @__PURE__ */ new Date(this.date + "T00:00:00");
    if (isNaN(target.getTime())) return null;
    const now = /* @__PURE__ */ new Date();
    now.setHours(0, 0, 0, 0);
    const days = Math.round((target.getTime() - now.getTime()) / 864e5);
    if (days < 0) return `**\u0414\u043E ${this.date.split("-").reverse().join(".")}:** \u043F\u0440\u043E\u0448\u043B\u043E ${formatDiff(-days * 864e5)} \u043D\u0430\u0437\u0430\u0434`;
    return `**\u0414\u043E ${this.date.split("-").reverse().join(".")}:** \u043E\u0441\u0442\u0430\u043B\u043E\u0441\u044C ${days} ${plural(days, "\u0434\u0435\u043D\u044C", "\u0434\u043D\u044F", "\u0434\u043D\u0435\u0439")}`;
  }
};
var IntervalsModal = class extends InsertModal {
  constructor() {
    super(...arguments);
    this.rows = [
      { start: "07:00", end: "14:00" },
      { start: "15:00", end: "18:00" }
    ];
  }
  build() {
    this.titleEl.setText("\u0421\u0443\u043C\u043C\u0430 \u0438\u043D\u0442\u0435\u0440\u0432\u0430\u043B\u043E\u0432");
    const list = this.contentEl.createDiv();
    const render = () => {
      list.empty();
      this.rows.forEach((row, i) => {
        const r = list.createDiv({ cls: "timetool-row" });
        const s = r.createEl("input", { type: "time", value: row.start });
        s.oninput = () => row.start = s.value;
        r.createEl("span", { text: "\u2014" });
        const e = r.createEl("input", { type: "time", value: row.end });
        e.oninput = () => row.end = e.value;
        if (this.rows.length > 1) {
          const x = r.createEl("button", { text: "\u2715" });
          x.onclick = () => {
            this.rows.splice(i, 1);
            render();
          };
        }
        const iv = this.intervalMs(row);
        r.createEl("span", { text: iv === null ? "\u2014" : formatDiff(iv), cls: "timetool-hint" });
      });
    };
    const add = this.contentEl.createEl("button", { text: "\uFF0B \u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0438\u043D\u0442\u0435\u0440\u0432\u0430\u043B" });
    add.onclick = () => {
      this.rows.push({ start: "09:00", end: "18:00" });
      render();
    };
    render();
  }
  intervalMs(row) {
    const [sh, sm] = row.start.split(":").map(Number);
    const [eh, em] = row.end.split(":").map(Number);
    if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return null;
    let d = eh * 60 + em - (sh * 60 + sm);
    if (d < 0) d += 24 * 60;
    return d * 6e4;
  }
  result() {
    const parts = this.rows.map((r) => this.intervalMs(r)).filter((x) => x !== null);
    if (parts.length === 0) return null;
    const total = parts.reduce((a, b) => a + b, 0);
    return `**\u0421\u0443\u043C\u043C\u0430 \u0438\u043D\u0442\u0435\u0440\u0432\u0430\u043B\u043E\u0432:** ${formatDiff(total)} (${(total / 36e5).toFixed(1)} \u0447)`;
  }
};
var TimeToolPlugin = class extends import_obsidian.Plugin {
  async onload() {
    this.addCommand({
      id: "diff",
      name: "\u0420\u0430\u0437\u043D\u0438\u0446\u0430 \u043C\u0435\u0436\u0434\u0443 \u043C\u043E\u043C\u0435\u043D\u0442\u0430\u043C\u0438",
      editorCallback: (editor) => new DiffModal(this.app, editor).open()
    });
    this.addCommand({
      id: "shift",
      name: "\u0421\u0434\u0432\u0438\u0433 \u0434\u0430\u0442\u044B",
      editorCallback: (editor) => new ShiftModal(this.app, editor).open()
    });
    this.addCommand({
      id: "until",
      name: "\u041E\u0442\u0441\u0447\u0451\u0442 \u0434\u043E \u0434\u0430\u0442\u044B",
      editorCallback: (editor) => new UntilModal(this.app, editor).open()
    });
    this.addCommand({
      id: "intervals",
      name: "\u0421\u0443\u043C\u043C\u0430 \u0438\u043D\u0442\u0435\u0440\u0432\u0430\u043B\u043E\u0432 (\u0441\u043C\u0435\u043D\u044B)",
      editorCallback: (editor) => new IntervalsModal(this.app, editor).open()
    });
  }
  onunload() {
  }
};
