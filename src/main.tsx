import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MdArrowDropDown, MdCopyAll, MdCheck } from "react-icons/md";
import "./index.css";

const ROOT_ID = "my-generate-journal-root";
const INP_TEACHER_NOTE_SEL = '[data-pw="input-teacher-note"]';
const INP_ACTIVE_PROJECT_NAME_SEL = '[data-pw="input-project-name"]';
const CRAETE_JOURNAL_PAGE =
  "https://cms.timedooracademy.com/tms/student/*/session/*/session-history/*/meeting/*";

let root: Root | null = null;
let mountedContainer: Element | null = null;

function findToken() {
  return (
    document.cookie
      .split("; ")
      .find((cookie) => cookie.startsWith("access_token"))
      ?.split("=")[1] ?? null
  );
}

function parseIds() {
  // /tms/student/:id/session/:sid/session-history/:shid/meeting/:meetingId
  const m = location.pathname.match(
    /\/tms\/student\/(\d+)\/session\/(\d+)\/session-history\/(\d+)\/meeting\/(\d+)/,
  );
  if (!m) return null;
  return { studentId: m[1], sid: m[2], shid: m[3], mid: m[4] };
}

function getTeacherNote() {
  return (
    document.querySelector<HTMLTextAreaElement>(
      `${INP_TEACHER_NOTE_SEL} textarea`,
    )?.value ?? ""
  );
}

function getActiveProjectName() {
  return (
    document.querySelector<HTMLTextAreaElement>(
      `${INP_ACTIVE_PROJECT_NAME_SEL} input`,
    )?.value ?? ""
  );
}

async function fetchJson(path: string, token: string) {
  const headers: HeadersInit = { Accept: "application/json" };
  if (token) headers.Authorization = "Bearer " + token;
  const r = await fetch(path, { headers, credentials: "include" });
  const t = await r.text();
  try {
    return { status: r.status, body: JSON.parse(t) };
  } catch {
    return { status: r.status, body: t };
  }
}

async function collectContext() {
  const ids = parseIds();
  const activeProject = getActiveProjectName();
  const teacherNote = getTeacherNote();
  const token = findToken();

  let allMeetings = [],
    currentMeeting = null,
    student = null;
  if (!ids) return null;
  if (!token) return null;
  const base = `/api/tms/student/${ids.studentId}/learning-session/${ids.sid}/book/${ids.shid}/meeting-history`;
  const [getStudent, meetingHistories, meetingActivities, getCurrentMeeting] =
    await Promise.all([
      fetchJson(
        `https://cms.timedooracademy.com/api/tms/student/${ids.studentId}`,
        token,
      ),
      fetchJson(`${base}?limit=100`, token),
      fetchJson(`${base}/activity`, token),
      fetchJson(`${base}/${ids.mid}`, token),
    ]);

  if (
    meetingHistories.status === 200 &&
    meetingHistories.body.data &&
    meetingActivities.status === 200 &&
    meetingActivities.body.data
  ) {
    // left join
    allMeetings = meetingHistories.body.data
      .map((mh: any) => ({
        ...mh,
        activities: mh.activities.map((mha: any) => ({
          ...meetingActivities.body.data.find((ma: any) => ma.id === mha.id)
            .data,
        })),
      }))
      .sort((a: any, b: any) =>
        a.name.localeCompare(b.name, undefined, { numeric: true }),
      );
  }

  if (getCurrentMeeting.status === 200)
    currentMeeting = getCurrentMeeting.body.data || getCurrentMeeting.body;

  if (getStudent.status == 200)
    student = getStudent.body.data || getStudent.body;

  return {
    ids,
    student,
    activeProject,
    teacherNote,
    currentMeeting,
    allMeetings,
    url: location.href,
  };
}

function buildPrompt(ctx: any, lang: string) {
  const lines = [];

  if (lang === "ID") {
    lines.push(
      `Buat jurnal harian pembelajaran coding Timedoor Academy dalam bahasa Indonesia berdasarkan data siswa, catatan guru, dan riwayat pembelajaran yang diberikan.`,
    );
    lines.push(
      "Gaya penulisan: Profesional, natural, ringkas, jelas, spesifik, dan konstruktif.",
    );
    lines.push(
      "Gunakan sudut pandang laporan guru tentang pembelajaran dan perkembangan siswa.",
    );
    lines.push(
      "Jelaskan materi yang dipelajari, kemampuan yang ditunjukkan, serta aktivitas yang dilakukan pada pertemuan ini.",
    );
    lines.push(
      "Gunakan lesson sebelumnya sebagai referensi untuk memperkaya evaluasi jika relevan.",
    );
    lines.push(
      "Struktur output: Buat 1–3 paragraf sesuai kebutuhan. Jangan memaksakan semua aspek ke dalam setiap jurnal.",
    );
    lines.push(
      "Pembelajaran: Jelaskan materi atau keterampilan yang dipelajari berdasarkan lesson dan catatan guru.",
    );
    lines.push(
      "Evaluasi kemampuan: Jelaskan kelancaran belajar, kemampuan yang ditunjukkan, atau kebutuhan bimbingan jika didukung oleh catatan guru atau data yang tersedia. Riwayat lesson sebelumnya boleh digunakan untuk memberikan konteks yang relevan.",
    );
    lines.push(
      "Aktivitas latihan atau proyek: Jika siswa melakukan latihan atau mengembangkan proyek, jelaskan aktivitas dan fitur yang dikerjakan secara spesifik. Jika pertemuan hanya berfokus pada pembelajaran materi, jangan menambahkan aktivitas proyek.",
    );
    lines.push(
      "Langkah selanjutnya: Sebutkan rencana berikutnya jika tercantum dalam catatan guru. Jika tidak tersedia, berikan rekomendasi yang relevan hanya jika bermanfaat. Jangan membuat rekomendasi sekadar untuk memenuhi struktur.",
    );
    lines.push("Aturan penting:");
    lines.push(
      `
      Prioritaskan catatan guru untuk pertemuan saat ini dan pertahankan maknanya.
      Gunakan riwayat pembelajaran hanya sebagai referensi, bukan bukti bahwa siswa menguasai seluruh materi sebelumnya.
      Jangan mengarang materi, aktivitas, nilai kuis, persentase kemajuan, tingkat kemampuan, kemandirian, kesulitan, atau perilaku siswa.
      Cantumkan nilai kuis atau persentase kemajuan hanya jika tersedia untuk pertemuan saat ini dan relevan untuk laporan.
      Bedakan fakta yang tercatat dari rekomendasi atau saran.
      Jika catatan guru singkat, kembangkan penjelasan dengan konteks materi sebelumnya yang relevan tanpa menambahkan fakta baru.
      Gunakan istilah teknis coding yang sesuai, seperti Tilemap, behavior, variable, event sheet, respawn, dan collectible item.
      Hindari pengulangan, pujian berlebihan, dan kalimat umum yang tidak memberikan informasi berarti.
      Setiap paragraf maksimal 500 karakter.
      Tulis hanya jurnal akhir tanpa judul, bullet point, atau penjelasan tambahan.
      `,
    );

    if (ctx.student) lines.push(`Nama siswa: ${ctx.student.nickname || ""}`);

    if (ctx.currentMeeting)
      lines.push(`Pertemuan saat ini: ${ctx.currentMeeting.name || ""}`);

    if (ctx.teacherNote) lines.push(`Catatan guru: ${ctx.teacherNote || ""}`);

    if (ctx.activeProject)
      lines.push(`Proyek aktif: ${JSON.stringify(ctx.activeProject) || ""}`);

    if (ctx.allMeetings?.length) {
      lines.push("Semua pertemuan dan materi yang telah dipelajari:");

      ctx.allMeetings
        .slice(0, parseInt(ctx.currentMeeting.name.split(" ")[1]))
        .forEach((m: any) => {
          lines.push(`- [${m.name}] ${m.date}`);
          m.activities.forEach((a: any) => {
            lines.push(
              `└── ${a.content ?? "?"} | tujuan: ${(a.objectives || []).join("; ")} | persentase kemajuan: ${a.progress_percentage ?? "?"} | nilai kuis: ${a.value ?? "?"}`,
            );
          });
        });
    } else {
      lines.push("Materi: (belum ada yang dipilih)");
    }
  } else if (lang === "EN") {
    lines.push(
      `Write a daily coding learning journal for Timedoor Academy in English, based on the provided student data, teacher's notes, and learning history.`,
    );
    lines.push(
      "Writing style: Professional, natural, concise, clear, specific, and constructive.",
    );
    lines.push(
      "Write from the teacher's perspective, describing the student's learning experience and progress.",
    );
    lines.push(
      "Explain the material learned, skills demonstrated, and activities completed during the current meeting.",
    );
    lines.push(
      "Use previous lessons as references to enrich the evaluation when relevant.",
    );
    lines.push(
      "Output structure: Write 1–3 paragraphs as appropriate. Do not force every aspect into every journal entry.",
    );
    lines.push(
      "Learning: Describe the material or skills learned based on the lesson and teacher's notes.",
    );
    lines.push(
      "Skills evaluation: Describe the student's learning progress, demonstrated abilities, or need for additional guidance only when supported by the teacher's notes or available data. Previous lessons may be used to provide relevant context.",
    );
    lines.push(
      "Practice or project activities: If the student practiced skills or worked on a project, describe the activities and features developed specifically. If the meeting focused only on learning new material, do not invent project activities.",
    );
    lines.push(
      "Next steps: Mention the next steps if they are included in the teacher's notes. Otherwise, provide relevant recommendations only when useful. Do not add recommendations merely to fill the structure.",
    );
    lines.push("Important rules:");
    lines.push(
      `
  Prioritize the teacher's notes for the current meeting and preserve their original meaning.
  Use learning history only as a reference, not as proof that the student has mastered all previously covered material.
  Do not invent learning materials, activities, quiz scores, progress percentages, skill levels, independence, difficulties, or student behavior.
  Include quiz scores or progress percentages only when they are available for the current meeting and relevant to the report.
  Clearly distinguish recorded facts from recommendations or suggestions.
  If the teacher's notes are brief, expand the explanation using relevant context from previous lessons without introducing unsupported facts.
  Use appropriate coding terminology, such as Tilemap, behavior, variable, event sheet, respawn, and collectible item.
  Avoid repetition, excessive praise, and generic statements that provide little meaningful information.
  Each paragraph must contain no more than 500 characters.
  Output only the final journal entry, without headings, bullet points, or additional explanations.
  `,
    );

    if (ctx.student) lines.push(`Student name: ${ctx.student.nickname || ""}`);

    if (ctx.currentMeeting)
      lines.push(`Current meeting: ${ctx.currentMeeting.name || ""}`);

    if (ctx.teacherNote) lines.push(`Teacher note: ${ctx.teacherNote || ""}`);

    if (ctx.activeProject)
      lines.push(`Active project: ${JSON.stringify(ctx.activeProject) || ""}`);

    if (ctx.allMeetings?.length) {
      lines.push("All meetings and lessons learned:");

      ctx.allMeetings
        .slice(0, parseInt(ctx.currentMeeting.name.split(" ")[1]))
        .forEach((m: any) => {
          lines.push(`- [${m.name}] ${m.date}`);
          m.activities.forEach((a: any) => {
            lines.push(
              `└── ${a.content ?? "?"} | objectives: ${(a.objectives || []).join("; ")} | progress percentage : ${a.progress_percentage ?? "?"} | quiz score: ${a.value ?? "?"}`,
            );
          });
        });
    } else lines.push("Lessons: (none selected)");
  }

  return lines.join("\n");
}

async function generate(lang: string) {
  const ctx = await collectContext();
  return buildPrompt(ctx, lang);
}

function TextModal({
  isOpen,
  onClose,
  text,
}: {
  isOpen: boolean;
  onClose: () => void;
  text: string;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) setCopied(false);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div
      className="text-modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="text-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="text-modal-title"
      >
        <div className="text-modal-header">
          <button className="text-modal-copy" onClick={handleCopy}>
            {copied ? <MdCheck size="1.5em" /> : <MdCopyAll size="1.5em" />}
            <span>{copied ? "Copied" : "Copy"} to Clipboard</span>
          </button>

          <button
            className="text-modal-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>

        <pre className="text-modal-content">{text}</pre>

        <div className="text-modal-footer"></div>
      </div>
    </div>
  );
}

function Dropdown({
  lang,
  setLang,
  disabled,
}: {
  lang: string;
  setLang: Dispatch<SetStateAction<string>>;
  disabled: boolean;
}) {
  const [open, setOpen] = useState<boolean>(false);

  return (
    <div
      className={`dropdown ${disabled && "disabled"}`}
      onMouseEnter={() => !disabled && setOpen(true)}
      onMouseLeave={() => !disabled && setOpen(false)}
    >
      <span>
        {lang}
        <MdArrowDropDown size="2em" />
      </span>

      {open && (
        <div className="dropdown-menu">
          <span
            onClick={() => {
              setLang("ID");
              setOpen(false);
            }}
          >
            ID
          </span>
          <span
            onClick={() => {
              setLang("EN");
              setOpen(false);
            }}
          >
            EN
          </span>
        </div>
      )}
    </div>
  );
}

function JournalButton() {
  const [val, setVal] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [modal, setModal] = useState<{ text: string; isOpen: boolean }>({
    text: "",
    isOpen: false,
  });
  const [lang, setLang] = useState<string>(
    () => localStorage.getItem("promptLang") || "ID",
  );

  useEffect(() => {
    localStorage.setItem("promptLang", lang);
  }, [lang]);

  useEffect(() => {
    const el = document.querySelector<HTMLTextAreaElement>(
      `${INP_TEACHER_NOTE_SEL} textarea`,
    );
    if (!el) return;
    const onInput = (e: Event) =>
      setVal((e.currentTarget as HTMLTextAreaElement).value);
    el.addEventListener("input", onInput);
    setVal(el.value);

    return () => el.removeEventListener("input", onInput);
  }, []);

  return (
    <>
      <TextModal
        isOpen={modal.isOpen}
        onClose={() => setModal((old) => ({ ...old, isOpen: false }))}
        text={modal.text}
      />
      <div className="my-generate-journal-button">
        <button
          disabled={!val.trim() || loading}
          onClick={async () => {
            try {
              setLoading(true);
              const prompt = await generate(lang);
              setModal((old) => ({ ...old, text: prompt, isOpen: true }));
              console.log(prompt);
            } catch (error) {
              console.error(error);
            } finally {
              setLoading(false);
            }
          }}
        >
          {loading ? "Generating Prompt..." : "Generate Prompt"}
        </button>

        <Dropdown
          lang={lang}
          setLang={setLang}
          disabled={!val.trim() || loading}
        />
      </div>
    </>
  );
}

function isMatch(url: string, pattern: string) {
  const regex = new RegExp(
    "^" +
      pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^/]+") +
      "$",
  );
  return regex.test(url);
}

function syncUI() {
  const urlMatches = isMatch(location.href, CRAETE_JOURNAL_PAGE);

  const container = urlMatches
    ? document
        .querySelectorAll(".page-content-container .v-row")[0]
        ?.querySelectorAll(":scope > div")[1]
    : null;

  if (container === mountedContainer && root) {
    return;
  }

  // Clean up the previous mount.
  root?.unmount();
  document.getElementById(ROOT_ID)?.remove();

  root = null;
  mountedContainer = null;

  if (!container) return;

  const host = document.createElement("div");
  host.id = ROOT_ID;
  container.prepend(host);

  root = createRoot(host);
  mountedContainer = container;

  root.render(<JournalButton />);
}

const observer = new MutationObserver(syncUI);

observer.observe(document.documentElement, {
  childList: true,
  subtree: true,
});

syncUI();
