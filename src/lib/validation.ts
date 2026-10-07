import { z } from "zod";

import { ApiError } from "@/lib/api-security";

const MAX_JSON_BODY_BYTES = 64 * 1024;
const MAX_MONEY = 100_000_000;

function hasAtMostTwoDecimalPlaces(
  value: number,
) {
  return (
    Math.round(value * 100) /
      100 ===
    value
  );
}

function normalizeMoney(
  value: number,
) {
  return (
    Math.round(value * 100) /
    100
  );
}

function moneyInput(
  positive: boolean,
) {
  const base = z.preprocess(
    (value) => {
      /*
       * Form inputs are sometimes submitted as strings.
       * Accept non-empty numeric strings without allowing "" to become 0.
       */
      if (
        typeof value === "string"
      ) {
        const trimmed =
          value.trim();

        if (!trimmed) {
          return value;
        }

        const numeric =
          Number(trimmed);

        return Number.isFinite(
          numeric,
        )
          ? numeric
          : value;
      }

      return value;
    },
    z
      .number()
      .finite()
      .max(MAX_MONEY),
  );

  const signed = positive
    ? base.refine(
        (value) => value > 0,
        {
          message:
            "Amount must be greater than zero",
        },
      )
    : base.refine(
        (value) => value >= 0,
        {
          message:
            "Amount cannot be negative",
        },
      );

  return signed
    .refine(
      hasAtMostTwoDecimalPlaces,
      {
        message:
          "Amount must have at most 2 decimal places",
      },
    )
    .transform(
      normalizeMoney,
    );
}

export async function parseJson<
  T extends z.ZodType,
>(
  req: Request,
  schema: T,
): Promise<z.infer<T>> {
  const contentLength =
    req.headers.get(
      "content-length",
    );

  if (contentLength) {
    const declaredBytes =
      Number(contentLength);

    if (
      Number.isFinite(
        declaredBytes,
      ) &&
      declaredBytes >
        MAX_JSON_BODY_BYTES
    ) {
      throw new ApiError(
        413,
        "Request body too large",
      );
    }
  }

  let rawBody: string;

  try {
    rawBody =
      await req.text();
  } catch {
    throw new ApiError(
      400,
      "Invalid request body",
    );
  }

  const actualBytes =
    new TextEncoder().encode(
      rawBody,
    ).byteLength;

  if (
    actualBytes >
    MAX_JSON_BODY_BYTES
  ) {
    throw new ApiError(
      413,
      "Request body too large",
    );
  }

  let body: unknown;

  try {
    body =
      JSON.parse(rawBody);
  } catch {
    throw new ApiError(
      400,
      "Invalid JSON",
    );
  }

  const result =
    schema.safeParse(body);

  if (!result.success) {
    throw new ApiError(
      400,
      "Invalid request data",
    );
  }

  return result.data;
}

const text = (
  max: number,
) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max);

const optionalText = (
  max: number,
) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable();

const money =
  moneyInput(false);

const positiveMoney =
  moneyInput(true);

const dateString = z
  .string()
  .trim()
  .min(1)
  .refine(
    (value) =>
      !Number.isNaN(
        Date.parse(value),
      ),
    "Invalid date",
  );

export const loginSchema = z
  .object({
    email: z
      .string()
      .trim()
      .email()
      .max(254)
      .transform((value) =>
        value.toLowerCase(),
      ),

    /*
     * Login validates credentials, not password strength.
     * Existing legacy passwords may be shorter than current creation rules.
     */
    password: z
      .string()
      .min(1)
      .max(256),
  })
  .strict();

export const employeeCreateSchema =
  z
    .object({
      name: text(120),

      email: z
        .string()
        .trim()
        .email()
        .max(254)
        .transform((value) =>
          value.toLowerCase(),
        ),

      password: z
        .string()
        .min(12)
        .max(256),

      phone:
        optionalText(32),

      position:
        optionalText(120),

      salary:
        money
          .optional()
          .nullable(),

      address:
        optionalText(300),

      hireDate:
        dateString
          .optional()
          .nullable(),

      status: z
        .enum([
          "ACTIVE",
          "VACATION",
          "SUSPENDED",
        ])
        .optional(),
    })
    .strict();

export const employeeUpdateSchema =
  z
    .object({
      phone:
        optionalText(32),

      position:
        optionalText(120),

      salary:
        money
          .optional()
          .nullable(),

      address:
        optionalText(300),

      hireDate:
        dateString
          .optional()
          .nullable(),

      status: z
        .enum([
          "ACTIVE",
          "VACATION",
          "SUSPENDED",
        ])
        .optional(),
    })
    .strict();

export const expenseSchema = z
  .object({
    title: text(160),

    amount:
      positiveMoney,

    notes:
      optionalText(2000),

    expenseDate:
      dateString.optional(),
  })
  .strict();

export const invoiceSchema = z
  .object({
    clientId: z
      .string()
      .cuid()
      .optional()
      .nullable(),

    customerName:
      optionalText(160),

    customerPhone:
      optionalText(32),

    title:
      text(200),

    description:
      optionalText(3000),

    totalAmount:
      positiveMoney,

    paidAmount:
      money
        .optional()
        .default(0),
  })
  .strict()
  .refine(
    (value) =>
      value.paidAmount <=
      value.totalAmount,
    {
      path: ["paidAmount"],
      message:
        "Paid amount cannot exceed total",
    },
  );

export const paymentSchema = z
  .object({
    amount:
      positiveMoney,

    notes:
      optionalText(2000),
  })
  .strict();

export const subscriptionSchema =
  z
    .object({
      clientId: z
        .string()
        .cuid(),

      planName:
        text(160),

      totalAmount:
        positiveMoney,

      paidAmount:
        money
          .optional()
          .default(0),

      startDate:
        dateString,

      endDate:
        dateString,

      notes:
        optionalText(2000),

      status: z
        .enum([
          "ACTIVE",
          "EXPIRED",
          "CANCELLED",
        ])
        .optional(),
    })
    .strict()
    .refine(
      (value) =>
        value.paidAmount <=
        value.totalAmount,
      {
        path: ["paidAmount"],
        message:
          "Paid amount cannot exceed total",
      },
    )
    .refine(
      (value) =>
        new Date(
          value.endDate,
        ) >=
        new Date(
          value.startDate,
        ),
      {
        path: ["endDate"],
        message:
          "End date must be after start date",
      },
    );
