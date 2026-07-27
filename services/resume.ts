import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";
import { type Profile } from "./supabase";
import { type GuideUnitFull, type GuideStep, type GuideUnit } from "./guide";

export interface ResumeDataInput {
  profile: Profile;
  goalTitle: string | null;
  specialization: string | null;
  careerPath?: string[];
  units: (GuideUnit | GuideUnitFull)[];
}

/**
 * Compiles a modern executive PDF resume from stored profile and learning path data,
 * and triggers a native share/download dialog or web download.
 */
export async function generateStudentResumePdf(data: ResumeDataInput): Promise<void> {
  const { profile, goalTitle, specialization, careerPath, units } = data;

  const studentName = profile.full_name.trim() || "Student";
  const schoolName = profile.school.trim() || "High School";
  const gradeLevel = profile.grade_level ? `Grade ${profile.grade_level}` : "";
  const majors = Array.isArray(profile.majors) && profile.majors.length > 0
    ? profile.majors.join(" • ")
    : null;

  // Extract all steps from full unit objects
  const allSteps: { step: GuideStep; unitTitle: string }[] = [];
  const completedUnitsList: { unitIndex: number; title: string; summary: string; isCompleted: boolean }[] = [];

  units.forEach((u) => {
    const isCompleted =
      u.status === "done" ||
      ("steps" in u && Array.isArray(u.steps) && u.steps.length > 0 && u.steps.every((s) => !!s.completedAt));

    completedUnitsList.push({
      unitIndex: u.unitIndex,
      title: u.title,
      summary: u.summary,
      isCompleted,
    });

    if ("steps" in u && Array.isArray(u.steps)) {
      u.steps.forEach((s) => {
        if (s.completedAt) {
          allSteps.push({ step: s, unitTitle: u.title });
        }
      });
    }
  });

  const currentDateStr = new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${studentName} - Resume</title>
  <style>
    @page {
      margin: 32px;
      size: letter;
    }
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      color: #334155;
      margin: 0;
      padding: 24px;
      background-color: #ffffff;
      line-height: 1.5;
    }
    .header-banner {
      border-bottom: 3px solid #55C5B1;
      padding-bottom: 16px;
      margin-bottom: 24px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .student-name {
      font-size: 28px;
      font-weight: 700;
      color: #203b60;
      margin: 0 0 6px 0;
      letter-spacing: -0.5px;
    }
    .header-meta {
      font-size: 13px;
      color: #64748b;
      font-weight: 500;
      margin: 0;
    }
    .header-meta span {
      margin-right: 12px;
    }
    .majors-pill {
      display: inline-block;
      margin-top: 6px;
      font-size: 12px;
      font-weight: 600;
      color: #107c8f;
      background-color: #ecf9fc;
      padding: 3px 10px;
      border-radius: 12px;
    }
    .section {
      margin-bottom: 22px;
    }
    .section-title {
      font-size: 15px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #203b60;
      border-bottom: 1.5px solid #e2e8f0;
      padding-bottom: 4px;
      margin-bottom: 12px;
      page-break-after: avoid;
      break-after: avoid;
    }
    .goal-card {
      background-color: #f8fafc;
      border-left: 4px solid #55C5B1;
      padding: 12px 16px;
      border-radius: 0 8px 8px 0;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .goal-title {
      font-size: 18px;
      font-weight: 700;
      color: #107c8f;
      margin: 0 0 4px 0;
    }
    .goal-spec {
      font-size: 13px;
      color: #475569;
      font-weight: 600;
      margin: 0;
    }
    .path-breadcrumbs {
      font-size: 12px;
      color: #64748b;
      margin-top: 6px;
    }
    .unit-item {
      margin-bottom: 12px;
      padding: 10px 14px;
      background-color: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .unit-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    }
    .unit-title {
      font-size: 14px;
      font-weight: 700;
      color: #1e293b;
    }
    .unit-badge {
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 10px;
      text-transform: uppercase;
    }
    .badge-completed {
      background-color: #d1fae5;
      color: #065f46;
    }
    .badge-active {
      background-color: #e0f2fe;
      color: #0369a1;
    }
    .unit-summary {
      font-size: 12.5px;
      color: #475569;
      margin: 0;
    }
    .skills-grid {
      margin-top: 8px;
    }
    .skill-card {
      display: inline-block;
      vertical-align: top;
      background-color: #f1f5f9;
      padding: 10px 12px;
      border-radius: 6px;
      border-left: 3px solid #107c8f;
      box-sizing: border-box;
      width: 48.5%;
      margin-right: 2%;
      margin-bottom: 10px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .skill-card:nth-child(2n) {
      margin-right: 0;
    }
    .skill-title {
      font-size: 13px;
      font-weight: 700;
      color: #1e293b;
      margin: 0 0 2px 0;
    }
    .skill-unit {
      font-size: 11px;
      color: #64748b;
      margin: 0;
    }
    .footer {
      margin-top: 32px;
      padding-top: 12px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: #94a3b8;
      page-break-inside: avoid;
      break-inside: avoid;
    }
  </style>
</head>
<body>
  <!-- Header Banner -->
  <div class="header-banner">
    <h1 class="student-name">${studentName}</h1>
    <p class="header-meta">
      <span>🏫 ${schoolName}</span>
      ${gradeLevel ? `<span>🎓 ${gradeLevel}</span>` : ""}
    </p>
    ${majors ? `<div class="majors-pill">Focus Areas: ${majors}</div>` : ""}
  </div>

  <!-- Target Career Focus -->
  ${
    goalTitle
      ? `
  <div class="section">
    <div class="section-title">Target Career Focus</div>
    <div class="goal-card">
      <div class="goal-title">${goalTitle}</div>
      ${specialization && specialization !== goalTitle ? `<div class="goal-spec">Specialization: ${specialization}</div>` : ""}
      ${careerPath && careerPath.length > 1 ? `<div class="path-breadcrumbs">Career Path: ${careerPath.join(" → ")}</div>` : ""}
    </div>
  </div>
  `
      : ""
  }

  <!-- Completed Learning Units & Milestones -->
  ${
    completedUnitsList.length > 0
      ? `
  <div class="section">
    <div class="section-title">Learning Units & Experience</div>
    ${completedUnitsList
      .map(
        (u) => `
      <div class="unit-item">
        <div class="unit-header">
          <span class="unit-title">Unit ${u.unitIndex}: ${u.title}</span>
          <span class="unit-badge ${u.isCompleted ? "badge-completed" : "badge-active"}">
            ${u.isCompleted ? "Completed" : "In Progress"}
          </span>
        </div>
        <p class="unit-summary">${u.summary}</p>
      </div>
    `
      )
      .join("")}
  </div>
  `
      : ""
  }

  <!-- Acquired Skills & Accomplishments -->
  ${
    allSteps.length > 0
      ? `
  <div class="section">
    <div class="section-title">Acquired Skills & Accomplishments (${allSteps.length})</div>
    <div class="skills-grid">
      ${allSteps
        .map(
          (item) => `
        <div class="skill-card">
          <div class="skill-title">✓ ${item.step.title}</div>
          <div class="skill-unit">${item.unitTitle}</div>
        </div>
      `
        )
        .join("")}
    </div>
  </div>
  `
      : ""
  }

  <!-- Verified Footer -->
  <div class="footer">
    <span>Verified via GuidEM Career Guidance System</span>
    <span>Generated ${currentDateStr}</span>
  </div>
</body>
</html>
  `;

  try {
    const { uri } = await Print.printToFileAsync({
      html: htmlContent,
      base64: false,
    });

    if (Platform.OS === "web") {
      // In web browser, open/download PDF link cleanly
      if (typeof window !== "undefined") {
        const link = window.document.createElement("a");
        link.href = uri;
        link.download = `${studentName.replace(/\s+/g, "_")}_Resume.pdf`;
        window.document.body.appendChild(link);
        link.click();
        window.document.body.removeChild(link);
      }
    } else {
      // On mobile native, trigger native share / save PDF sheet
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          UTI: ".pdf",
          mimeType: "application/pdf",
          dialogTitle: `${studentName} Resume`,
        });
      }
    }
  } catch (err: any) {
    console.warn("Failed to generate resume PDF:", err?.message ?? err);
    throw err;
  }
}
