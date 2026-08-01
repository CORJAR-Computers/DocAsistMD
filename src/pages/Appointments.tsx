import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { appointmentService } from "@/services/appointmentService";
import { useAuthStore } from "@/stores/authStore";
import { APPOINTMENT_STATUS_LABELS, APPOINTMENT_STATUS_COLORS, APPOINTMENT_STATUS_BADGE, APPOINTMENT_TYPE_LABELS } from "@/types/appointment";
import type { Appointment, AppointmentStatus } from "@/types/appointment";
import {
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  CheckCircle2,
  XCircle,
  Loader2,
  Play,
  LayoutGrid,
  List,
} from "lucide-react";
import NewAppointmentModal from "@/components/modals/NewAppointmentModal";
import AppointmentDetailModal from "@/components/modals/AppointmentDetailModal";
import { cn } from "@/lib/utils";

type ViewMode = "month" | "week" | "list";

const DAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

// ── Time-grid constants (native Date, no deps) ──
const HOUR_START = 7; // 07:00
const HOUR_END = 21; // 21:00
const HOUR_HEIGHT = 56; // px per hour
const PX_PER_MIN = HOUR_HEIGHT / 60;

const hours = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);

// ── Date helpers ──

const toDateKey = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** 42-cell month grid (Monday-first). Null = empty filler cell. */
function getMonthGrid(viewDate: Date): (Date | null)[] {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7; // Monday = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/** Monday-first array of the 7 days containing `viewDate`. */
function getWeekDays(viewDate: Date): Date[] {
  const day = (viewDate.getDay() + 6) % 7;
  const start = new Date(viewDate.getFullYear(), viewDate.getMonth(), viewDate.getDate() - day);
  return Array.from({ length: 7 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
}

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });

const formatHourLabel = (h: number) => `${String(h).padStart(2, "0")}:00`;

const toMinutes = (iso: string) => {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
};

/** Position appointments in day columns, handling overlaps side-by-side. */
interface PlacedApt {
  apt: Appointment;
  lane: number;
  lanes: number;
  top: number;
  height: number;
}

function layoutDay(apts: Appointment[]): PlacedApt[] {
  const sorted = [...apts].sort((a, b) => a.dateTime.localeCompare(b.dateTime));
  // Pass 1: greedily assign each appointment to the first free lane.
  // Since sorted by start and a lane is never re-checked once the last
  // appointment ends after a new start, lanes stay overlap-free.
  const lanes: Appointment[][] = [];
  const laneOf = new Map<string, number>();
  for (const apt of sorted) {
    const start = toMinutes(apt.dateTime);
    let lane = lanes.findIndex((l) => {
      const last = l[l.length - 1];
      const lastEnd = toMinutes(last.dateTime) + last.durationMinutes;
      return start >= lastEnd;
    });
    if (lane === -1) {
      lane = lanes.length;
      lanes.push([]);
    }
    lanes[lane].push(apt);
    laneOf.set(apt.id, lane);
  }
  // Pass 2: compute final geometry with the total lane count so every
  // block in the day shares consistent widths/positions.
  const total = Math.max(lanes.length, 1);
  return sorted.map((apt) => ({
    apt,
    lane: laneOf.get(apt.id)!,
    lanes: total,
    top: Math.max(0, (toMinutes(apt.dateTime) - HOUR_START * 60) * PX_PER_MIN),
    height: Math.max(apt.durationMinutes * PX_PER_MIN, 20),
  }));
}

export default function Appointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState<ViewMode>("month");
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(toDateKey(new Date()));
  const [filterStatus, setFilterStatus] = useState<AppointmentStatus | "all">("all");
  const [showModal, setShowModal] = useState(false);
  const [modalDate, setModalDate] = useState<string | undefined>(undefined);
  const [detailApt, setDetailApt] = useState<Appointment | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError("");
    appointmentService
      .getAll()
      .then(setAppointments)
      .catch((err) => { console.error(err); setError("Error al cargar las citas."); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const changeStatus = async (apt: Appointment, status: AppointmentStatus) => {
    setUpdatingId(apt.id);
    try {
      await appointmentService.updateStatus(apt.id, status, useAuthStore.getState().user?.id);
      const updated = { ...apt, status };
      setAppointments((prev) => prev.map((a) => (a.id === apt.id ? updated : a)));
      setDetailApt((d) => (d?.id === apt.id ? updated : d));
    } catch (err) {
      console.error(err);
      alert("No se pudo actualizar el estado de la cita.");
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = useMemo(
    () => appointments.filter((a) => filterStatus === "all" || a.status === filterStatus),
    [appointments, filterStatus]
  );

  // Appointments grouped by day key "YYYY-MM-DD", sorted by time
  const byDay = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    for (const a of filtered) {
      const k = a.dateTime.slice(0, 10);
      (map[k] ||= []).push(a);
    }
    for (const k in map) map[k].sort((a, b) => a.dateTime.localeCompare(b.dateTime));
    return map;
  }, [filtered]);

  const monthGrid = useMemo(() => getMonthGrid(viewDate), [viewDate]);
  const weekDays = useMemo(() => getWeekDays(viewDate), [viewDate]);

  const todayKey = toDateKey(new Date());
  const isToday = (d: Date) => toDateKey(d) === todayKey;
  const isSelected = (d: Date) => toDateKey(d) === selectedDate;

  // ── Navigation ──
  const shift = (delta: number) => {
    if (view === "month") {
      setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
    } else if (view === "week") {
      setViewDate((prev) => {
        const d = new Date(prev);
        d.setDate(d.getDate() + delta * 7);
        return d;
      });
    } else {
      const d = new Date(selectedDate + "T12:00:00");
      d.setDate(d.getDate() + delta);
      setSelectedDate(toDateKey(d));
    }
  };

  const goToday = () => {
    const now = new Date();
    setViewDate(now);
    setSelectedDate(toDateKey(now));
  };

  const openCreate = (dateTime?: string) => {
    setModalDate(dateTime);
    setShowModal(true);
  };

  const openCreateAt = (key: string, mins: number) => {
    const hh = String(Math.floor(mins / 60)).padStart(2, "0");
    const mm = String(mins % 60).padStart(2, "0");
    openCreate(`${key}T${hh}:${mm}`);
  };

  const viewLabel = () => {
    if (view === "month") {
      return viewDate.toLocaleDateString("es-CO", { month: "long", year: "numeric" });
    }
    if (view === "week") {
      const first = weekDays[0];
      const last = weekDays[6];
      return `${first.toLocaleDateString("es-CO", { day: "numeric", month: "short" })} – ${last.toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" })}`;
    }
    return new Date(selectedDate + "T12:00:00").toLocaleDateString("es-CO", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });
  };

  const dayList = byDay[selectedDate] || [];
  const dayPlaced = useMemo(() => layoutDay(dayList), [dayList]);

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nowInRange = nowMinutes >= HOUR_START * 60 && nowMinutes <= HOUR_END * 60;
  const gridHeight = HOUR_HEIGHT * hours.length;

  // Render an appointment block inside a time column
  const renderBlock = (p: PlacedApt) => (
    <button
      key={p.apt.id}
      onClick={(e) => { e.stopPropagation(); setDetailApt(p.apt); }}
      style={{
        top: p.top + 1,
        height: p.height - 2,
        left: `calc(${(p.lane / p.lanes) * 100}% + 2px)`,
        width: `calc(${100 / p.lanes}% - 4px)`,
      }}
      className={cn(
        "absolute z-10 rounded-md px-1.5 py-0.5 text-left text-[10px] leading-tight overflow-hidden shadow-sm hover:shadow-md hover:z-20 transition-all",
        APPOINTMENT_STATUS_COLORS[p.apt.status]
      )}
      title={`${formatTime(p.apt.dateTime)} · ${p.apt.patientName} · ${APPOINTMENT_STATUS_LABELS[p.apt.status]}`}
    >
      <span className="font-mono font-bold block">{formatTime(p.apt.dateTime)}</span>
      <span className="block truncate font-medium">{p.apt.patientName.split(" ")[0]}</span>
      <span className="block truncate opacity-80 hidden sm:block">{APPOINTMENT_TYPE_LABELS[p.apt.appointmentType]}</span>
    </button>
  );

  // Time gutter (labels) shared by week & day grids
  const timeGutter = (height: number) => (
    <div className="relative border-r border-border" style={{ height }}>
      {hours.map((h) => (
        <div
          key={h}
          className="absolute right-1.5 -translate-y-1/2 text-[10px] text-text-muted"
          style={{ top: (h - HOUR_START) * HOUR_HEIGHT }}
        >
          {formatHourLabel(h)}
        </div>
      ))}
    </div>
  );

  // Hour grid lines shared by week & day columns
  const hourLines = (day: Date) => (
    <>
      {hours.map((h) => (
        <div
          key={h}
          className="absolute left-0 right-0 border-t border-border/40"
          style={{ top: (h - HOUR_START) * HOUR_HEIGHT }}
        />
      ))}
      {isToday(day) && nowInRange && (
        <div
          className="absolute left-0 right-0 z-20 pointer-events-none"
          style={{ top: (nowMinutes - HOUR_START * 60) * PX_PER_MIN }}
        >
          <div className="h-0.5 bg-red-500 relative">
            <span className="absolute left-0 -top-[3px] w-2 h-2 rounded-full bg-red-500" />
          </div>
        </div>
      )}
    </>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Agenda de Citas</h1>
          <p className="text-sm text-text-light mt-1">Calendario mensual, semanal y diario del consultorio</p>
        </div>
        <Button className="gap-2" onClick={() => openCreate()}><Plus className="w-4 h-4" /> Nueva Cita</Button>
      </div>

      {/* Toolbar */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {/* View toggle */}
              <div className="flex items-center rounded-lg border border-border bg-surface-dark/50 p-0.5">
                <button
                  onClick={() => setView("month")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                    view === "month" ? "bg-white text-primary shadow-sm" : "text-text-light hover:text-text"
                  )}
                >
                  <LayoutGrid className="w-4 h-4" /> Mes
                </button>
                <button
                  onClick={() => setView("week")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                    view === "week" ? "bg-white text-primary shadow-sm" : "text-text-light hover:text-text"
                  )}
                >
                  <CalendarRange className="w-4 h-4" /> Semana
                </button>
                <button
                  onClick={() => setView("list")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                    view === "list" ? "bg-white text-primary shadow-sm" : "text-text-light hover:text-text"
                  )}
                >
                  <List className="w-4 h-4" /> Día
                </button>
              </div>

              {/* Navigation */}
              <div className="flex items-center gap-1.5 ml-1">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => shift(-1)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/5 min-w-[140px] justify-center">
                  <CalendarDays className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-primary capitalize">{viewLabel()}</span>
                </div>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => shift(1)}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" className="ml-1 h-8" onClick={goToday}>Hoy</Button>
              </div>
            </div>

            {/* Status filter */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <Button variant={filterStatus === "all" ? "default" : "outline"} size="sm" onClick={() => setFilterStatus("all")}>Todas</Button>
              <Button variant={filterStatus === "scheduled" ? "default" : "outline"} size="sm" onClick={() => setFilterStatus("scheduled")}>Programadas</Button>
              <Button variant={filterStatus === "confirmed" ? "default" : "outline"} size="sm" onClick={() => setFilterStatus("confirmed")}>Confirmadas</Button>
              <Button variant={filterStatus === "in_progress" ? "default" : "outline"} size="sm" onClick={() => setFilterStatus("in_progress")}>En Curso</Button>
              <Button variant={filterStatus === "completed" ? "default" : "outline"} size="sm" onClick={() => setFilterStatus("completed")}>Completadas</Button>
              <Button variant={filterStatus === "cancelled" ? "default" : "outline"} size="sm" onClick={() => setFilterStatus("cancelled")}>Canceladas</Button>
              <Button variant={filterStatus === "no_show" ? "default" : "outline"} size="sm" onClick={() => setFilterStatus("no_show")}>No Asistió</Button>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs text-text-muted">Leyenda:</span>
            {(Object.keys(APPOINTMENT_STATUS_LABELS) as AppointmentStatus[]).map((s) => (
              <span key={s} className="flex items-center gap-1.5 text-xs text-text-light">
                <span className={cn("w-2.5 h-2.5 rounded-full", APPOINTMENT_STATUS_COLORS[s].split(" ")[0])} />
                {APPOINTMENT_STATUS_LABELS[s]}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {error && <div className="p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm">{error}</div>}

      {loading ? (
        <Card><CardContent className="flex items-center justify-center gap-3 py-16 text-text-light">
          <Loader2 className="w-5 h-5 animate-spin" /> Cargando citas...
        </CardContent></Card>
      ) : (
        <>
          {/* ═══════════ MONTH VIEW ═══════════ */}
          {view === "month" && (
            <Card>
              <CardContent className="p-0">
                <div className="grid grid-cols-7 border-b border-border bg-surface-dark/50">
                  {DAY_LABELS.map((d) => (
                    <div key={d} className="px-2 py-2.5 text-center text-xs font-semibold text-text-light uppercase tracking-wider">
                      {d}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7">
                  {monthGrid.map((date, i) => {
                    if (!date) {
                      return <div key={`empty-${i}`} className="min-h-[104px] border-b border-r border-border/50 bg-surface/40" />;
                    }
                    const key = toDateKey(date);
                    const dayApts = byDay[key] || [];
                    const showMore = dayApts.length > 3;
                    return (
                      <div
                        key={key}
                        onClick={() => setSelectedDate(key)}
                        className={cn(
                          "min-h-[104px] border-b border-r border-border/50 p-1.5 cursor-pointer transition-colors group",
                          isToday(date) ? "bg-primary/[0.04]" : "hover:bg-surface-dark/40"
                        )}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className={cn(
                              "w-6 h-6 flex items-center justify-center rounded-full text-xs font-semibold",
                              isToday(date) && !isSelected(date) && "bg-primary text-white",
                              isSelected(date) && "bg-primary-dark text-white ring-2 ring-primary/30",
                              !isToday(date) && !isSelected(date) && "text-text"
                            )}
                          >
                            {date.getDate()}
                          </span>
                          <button
                            onClick={(e) => { e.stopPropagation(); openCreate(key + "T09:00"); }}
                            className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded bg-primary/10 text-primary hover:bg-primary hover:text-white flex items-center justify-center transition-all"
                            title="Nueva cita este día"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="space-y-1">
                          {dayApts.slice(0, 3).map((apt) => (
                            <button
                              key={apt.id}
                              onClick={(e) => { e.stopPropagation(); setDetailApt(apt); }}
                              className={cn(
                                "w-full text-left rounded px-1.5 py-0.5 text-[11px] leading-tight truncate hover:brightness-95 transition-all",
                                APPOINTMENT_STATUS_COLORS[apt.status]
                              )}
                              title={`${formatTime(apt.dateTime)} · ${apt.patientName} · ${APPOINTMENT_STATUS_LABELS[apt.status]}`}
                            >
                              <span className="font-mono font-semibold">{formatTime(apt.dateTime)}</span> {apt.patientName.split(" ")[0]}
                            </button>
                          ))}
                          {showMore && (
                            <p className="text-[11px] text-text-muted pl-1">{dayApts.length - 3} más...</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ═══════════ WEEK VIEW — hourly time grid ═══════════ */}
          {view === "week" && (
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <div className="min-w-[920px]">
                  {/* Day headers */}
                  <div className="grid sticky top-0 z-30 border-b border-border bg-surface-dark/95 backdrop-blur" style={{ gridTemplateColumns: `56px repeat(7, 1fr)` }}>
                    <div />
                    {weekDays.map((d) => (
                      <div
                        key={toDateKey(d)}
                        onClick={() => setSelectedDate(toDateKey(d))}
                        className={cn("px-2 py-2 text-center cursor-pointer transition-colors", isToday(d) && "bg-primary/[0.06]")}
                      >
                        <p className="text-[10px] font-semibold text-text-light uppercase tracking-wider">
                          {DAY_LABELS[(d.getDay() + 6) % 7]}
                        </p>
                        <p
                          className={cn(
                            "inline-flex w-7 h-7 items-center justify-center rounded-full text-sm font-semibold",
                            isToday(d) ? "bg-primary text-white" : "text-text",
                            isSelected(d) && !isToday(d) && "bg-primary-dark text-white"
                          )}
                        >
                          {d.getDate()}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Time grid */}
                  <div className="grid" style={{ gridTemplateColumns: `56px repeat(7, 1fr)` }}>
                    {timeGutter(gridHeight)}
                    {weekDays.map((d) => {
                      const key = toDateKey(d);
                      const dayApts = byDay[key] || [];
                      const placed = layoutDay(dayApts);
                      return (
                        <div
                          key={key}
                          className="relative overflow-hidden border-r border-border/50 last:border-r-0"
                          style={{ height: gridHeight }}
                          onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const mins = HOUR_START * 60 + Math.max(0, Math.round((e.clientY - rect.top) / PX_PER_MIN / 15) * 15);
                            openCreateAt(key, mins);
                          }}
                          title="Haz clic para crear una cita a esta hora"
                        >
                          {hourLines(d)}
                          {placed.map(renderBlock)}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ═══════════ DAY VIEW — time grid + agenda ═══════════ */}
          {view === "list" && (
            <div className="grid lg:grid-cols-[1fr_340px] gap-4 items-start">
              <Card>
                <CardContent className="p-0 overflow-x-auto">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border min-w-[560px]">
                    <p className="text-sm font-semibold text-text capitalize">
                      {new Date(selectedDate + "T12:00:00").toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" })}
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge variant="info">{dayList.length} cita(s)</Badge>
                      <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => openCreate(selectedDate + "T09:00")}>
                        <Plus className="w-3 h-3" /> Nueva
                      </Button>
                    </div>
                  </div>
                  <div className="min-w-[560px]">
                    <div className="grid" style={{ gridTemplateColumns: `56px 1fr` }}>
                      {timeGutter(gridHeight)}
                      <div
                        className="relative overflow-hidden border-r border-border/50"
                        style={{ height: gridHeight }}
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const mins = HOUR_START * 60 + Math.max(0, Math.round((e.clientY - rect.top) / PX_PER_MIN / 15) * 15);
                          openCreateAt(selectedDate, mins);
                        }}
                        title="Haz clic para crear una cita a esta hora"
                      >
                        {hourLines(new Date(selectedDate + "T12:00:00"))}
                        {dayPlaced.map(renderBlock)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Agenda side panel with quick actions */}
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm font-semibold text-text mb-3">Agenda del día</p>
                  {dayList.length === 0 ? (
                    <div className="py-10 text-center">
                      <CalendarDays className="w-10 h-10 text-text-muted mx-auto mb-3" />
                      <p className="text-xs text-text-light">No hay citas para esta fecha y filtro</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {dayList.map((apt) => (
                        <div
                          key={apt.id}
                          className="rounded-lg border border-border/60 bg-white p-3 hover:shadow-sm transition-all"
                        >
                          <div className="flex items-center gap-2 mb-1.5">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <Clock className="w-3.5 h-3.5 text-primary" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-text font-mono">{formatTime(apt.dateTime)} · {apt.durationMinutes} min</p>
                              <p className="text-xs text-text truncate">{apt.patientName}</p>
                            </div>
                            <Badge variant={APPOINTMENT_STATUS_BADGE[apt.status]}>{APPOINTMENT_STATUS_LABELS[apt.status]}</Badge>
                          </div>
                          <p className="text-[11px] text-text-light truncate mb-2">
                            {apt.doctorName} - {APPOINTMENT_TYPE_LABELS[apt.appointmentType]}
                          </p>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {apt.status === "scheduled" && (
                              <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" disabled={updatingId === apt.id} onClick={() => changeStatus(apt, "confirmed")}>
                                <CheckCircle2 className="w-3 h-3 text-success" /> Confirmar
                              </Button>
                            )}
                            {(apt.status === "scheduled" || apt.status === "confirmed") && (
                              <>
                                <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" disabled={updatingId === apt.id} onClick={() => changeStatus(apt, "in_progress")}>
                                  <Play className="w-3 h-3 text-warning" /> Iniciar
                                </Button>
                                <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" disabled={updatingId === apt.id} onClick={() => changeStatus(apt, "cancelled")}>
                                  <XCircle className="w-3 h-3 text-danger" /> Cancelar
                                </Button>
                              </>
                            )}
                            {apt.status === "in_progress" && (
                              <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" disabled={updatingId === apt.id} onClick={() => changeStatus(apt, "completed")}>
                                <CheckCircle2 className="w-3 h-3 text-success" /> Completar
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setDetailApt(apt)}>Ver detalle</Button>
                            {updatingId === apt.id && <Loader2 className="w-4 h-4 animate-spin text-text-muted" />}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}

      {showModal && (
        <NewAppointmentModal
          onClose={() => setShowModal(false)}
          onCreated={() => { setShowModal(false); load(); }}
          preselectedDateTime={modalDate}
        />
      )}
      {detailApt && (
        <AppointmentDetailModal
          appointment={detailApt}
          updating={updatingId === detailApt.id}
          onStatusChange={(status) => changeStatus(detailApt, status)}
          onClose={() => setDetailApt(null)}
        />
      )}
    </div>
  );
}
