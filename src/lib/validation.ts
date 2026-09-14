import { z } from "zod";
import { DATE_MODES, PROJECT_STATUSES, TASK_STATUSES, WORK_TYPES } from "./types";

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "날짜 형식이 올바르지 않습니다");
const timeStr = z.string().regex(/^\d{2}:\d{2}$/, "시간 형식이 올바르지 않습니다");

export const taskFormSchema = z
  .object({
    work_type: z.enum(WORK_TYPES),
    title: z.string().trim().min(1, "Task를 입력해주세요").max(200, "200자 이내로 입력해주세요"),
    project_id: z.string().uuid().nullable(),
    date_mode: z.enum(DATE_MODES),
    start_date: dateStr.nullable(),
    start_time: timeStr.nullable(),
    end_date: dateStr.nullable(),
    end_time: timeStr.nullable(),
    status: z.enum(TASK_STATUSES),
    priority: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.date_mode === "none") return;

    const isRange = data.date_mode === "date_range" || data.date_mode === "datetime_range";
    const needsTime = data.date_mode === "datetime" || data.date_mode === "datetime_range";

    if (!data.start_date) {
      ctx.addIssue({ code: "custom", message: "날짜를 입력해주세요", path: ["start_date"] });
      return;
    }
    if (isRange && !data.end_date) {
      ctx.addIssue({ code: "custom", message: "종료일을 입력해주세요", path: ["end_date"] });
    }
    if (isRange && data.end_date && data.end_date < data.start_date) {
      ctx.addIssue({ code: "custom", message: "종료일은 시작일보다 빠를 수 없습니다", path: ["end_date"] });
    }
    if (needsTime && !data.start_time) {
      ctx.addIssue({ code: "custom", message: "시작 시간을 입력해주세요", path: ["start_time"] });
    }
    if (data.date_mode === "datetime_range" && !data.end_time) {
      ctx.addIssue({ code: "custom", message: "종료 시간을 입력해주세요", path: ["end_time"] });
    }
  });

export type TaskFormValues = z.infer<typeof taskFormSchema>;

export const projectFormSchema = z
  .object({
    name: z.string().trim().min(1, "프로젝트명을 입력해주세요").max(200, "200자 이내로 입력해주세요"),
    work_type: z.enum(WORK_TYPES),
    start_date: dateStr.nullable(),
    end_date: dateStr.nullable(),
    status: z.enum(PROJECT_STATUSES),
    priority: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.start_date && data.end_date && data.end_date < data.start_date) {
      ctx.addIssue({ code: "custom", message: "마감일은 시작일보다 빠를 수 없습니다", path: ["end_date"] });
    }
  });

export type ProjectFormValues = z.infer<typeof projectFormSchema>;
