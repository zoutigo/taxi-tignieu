"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const upsertSchema = z
  .object({
    id: z.string().optional(),
    question: z.string().min(5),
    answer: z.string().min(5),
    categoryId: z.string().optional().nullable(),
    isFeatured: z.boolean().optional(),
    isValidated: z.boolean().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.isFeatured && !val.isValidated) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["isFeatured"],
        message: "Une FAQ doit être validée avant d'être mise en avant.",
      });
    }
  });

export async function upsertFaq(formData: FormData) {
  const parsed = upsertSchema.safeParse({
    id: formData.get("id")?.toString() || undefined,
    question: formData.get("question")?.toString() ?? "",
    answer: formData.get("answer")?.toString() ?? "",
    categoryId: formData.get("categoryId")?.toString() || undefined,
    isFeatured: formData.get("isFeatured") === "true",
    isValidated: formData.get("isValidated") === "true",
  });

  if (!parsed.success) {
    return { error: "Champs invalides" };
  }

  const { id, question, answer, categoryId } = parsed.data;
  if (id) {
    await prisma.faq.update({
      where: { id },
      data: {
        question,
        answer,
        categoryId: categoryId ?? null,
        isFeatured: parsed.data.isFeatured ?? false,
        isValidated: parsed.data.isValidated ?? true,
      },
    });
  } else {
    await prisma.faq.create({
      data: {
        question,
        answer,
        isFeatured: parsed.data.isFeatured ?? false,
        isValidated: parsed.data.isValidated ?? true,
        categoryId: categoryId ?? null,
      },
    });
  }

  revalidatePath("/dashboard/faq");
  return { ok: true };
}

export async function deleteFaq(formData: FormData) {
  const id = formData.get("id")?.toString();
  if (!id) return { error: "Identifiant manquant" };

  await prisma.faq.delete({ where: { id } }).catch(() => null);
  revalidatePath("/dashboard/faq");
  return { ok: true };
}
