"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] =
    useState("");
  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);
  const [error, setError] =
    useState("");

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>,
  ) {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const res =
        await fetch("/api/login", {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            email,
            password,
          }),
        });

      const data =
        await res.json();

      if (!res.ok) {
        setError(
          data.message ||
            "فشل تسجيل الدخول",
        );
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError(
        "حدث خطأ أثناء تسجيل الدخول",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      dir="rtl"
      className="relative min-h-screen overflow-hidden bg-[#f7f9fc] px-4 py-8 sm:px-6"
    >
      {/* Brand background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
      >
        <div className="absolute -left-24 -top-28 h-[380px] w-[380px] rounded-full bg-[radial-gradient(circle_at_center,rgba(247,148,51,0.30),rgba(247,148,51,0.10)_45%,transparent_72%)] blur-2xl sm:h-[520px] sm:w-[520px]" />

        <div className="absolute -bottom-24 -left-20 h-[360px] w-[460px] rounded-full bg-[radial-gradient(circle_at_center,rgba(36,84,145,0.22),rgba(36,84,145,0.08)_45%,transparent_72%)] blur-3xl sm:h-[500px] sm:w-[620px]" />

        <div className="absolute -right-24 top-[20%] h-[520px] w-[520px] rotate-[-18deg] opacity-[0.11]">
          <svg
            viewBox="0 0 520 520"
            className="h-full w-full"
          >
            <path
              d="M80 385 245 220l72 72L152 457z"
              fill="#f28a32"
            />
            <path
              d="M208 393 402 199l-58-58 122-34-34 122-58-58-194 194z"
              fill="#12345b"
            />
          </svg>
        </div>

        <div className="absolute left-[4%] top-[10%] grid grid-cols-6 gap-3 opacity-25">
          {Array.from({
            length: 24,
          }).map((_, index) => (
            <span
              key={index}
              className="h-1.5 w-1.5 rounded-full bg-[#12345b]"
            />
          ))}
        </div>

        <div className="absolute bottom-[10%] right-[7%] grid grid-cols-5 gap-3 opacity-20">
          {Array.from({
            length: 20,
          }).map((_, index) => (
            <span
              key={index}
              className="h-1.5 w-1.5 rounded-full bg-[#f28a32]"
            />
          ))}
        </div>
      </div>

      <div className="relative z-10 flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <section className="w-full max-w-[520px]">
          <div className="overflow-hidden rounded-[30px] border border-white/80 bg-white/95 shadow-[0_28px_80px_rgba(15,35,64,0.14)] backdrop-blur-xl">
            <div className="h-1.5 w-full bg-gradient-to-l from-[#f6a338] via-[#ee7c31] to-[#14365f]" />

            <div className="px-6 py-8 sm:px-10 sm:py-10">
              <div className="mb-7 flex justify-center">
                <div className="relative flex h-[118px] w-[118px] items-center justify-center rounded-full bg-white shadow-[0_14px_35px_rgba(19,54,95,0.12)] ring-1 ring-slate-100 sm:h-[128px] sm:w-[128px]">
                  <Image
                    src="/logo.png"
                    alt="TrendX"
                    width={108}
                    height={108}
                    priority
                    className="h-auto w-[96px] object-contain sm:w-[106px]"
                  />
                </div>
              </div>

              <div className="mb-8 text-center">
                <h1 className="text-3xl font-black tracking-tight text-[#102f55] sm:text-[36px]">
                  TrendX OS
                </h1>

                <p className="mt-2 text-sm font-medium text-slate-500 sm:text-base">
                  تسجيل الدخول إلى النظام
                </p>
              </div>

              <form
                onSubmit={
                  handleSubmit
                }
                className="space-y-5"
              >
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-bold text-[#17385f]"
                  >
                    البريد الإلكتروني
                  </label>

                  <div className="group relative">
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex w-12 items-center justify-center text-slate-400 transition-colors group-focus-within:text-[#17385f]">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        className="h-5 w-5"
                        aria-hidden="true"
                      >
                        <path
                          d="M4 6.5h16v11H4z"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinejoin="round"
                        />
                        <path
                          d="m5 7 7 5.2L19 7"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>

                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) =>
                        setEmail(
                          e.target
                            .value,
                        )
                      }
                      placeholder="admin@trendx.com"
                      required
                      className="h-14 w-full rounded-2xl border border-[#d8e2ef] bg-[#f5f8fd] px-4 pr-12 text-left text-[15px] text-slate-900 outline-none transition duration-200 placeholder:text-slate-400 focus:border-[#f39a38] focus:bg-white focus:ring-4 focus:ring-[#f39a38]/10"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-bold text-[#17385f]"
                  >
                    كلمة المرور
                  </label>

                  <div className="group relative">
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex w-12 items-center justify-center text-slate-400 transition-colors group-focus-within:text-[#17385f]">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        className="h-5 w-5"
                        aria-hidden="true"
                      >
                        <path
                          d="M7.5 10V7.8a4.5 4.5 0 0 1 9 0V10"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                        />
                        <rect
                          x="5"
                          y="10"
                          width="14"
                          height="10"
                          rx="2.2"
                          stroke="currentColor"
                          strokeWidth="1.8"
                        />
                        <path
                          d="M12 14v2.5"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>

                    <input
                      id="password"
                      type="password"
                      autoComplete="current-password"
                      value={
                        password
                      }
                      onChange={(e) =>
                        setPassword(
                          e.target
                            .value,
                        )
                      }
                      placeholder="••••••••"
                      required
                      className="h-14 w-full rounded-2xl border border-[#d8e2ef] bg-[#f5f8fd] px-4 pr-12 text-left text-[15px] text-slate-900 outline-none transition duration-200 placeholder:text-slate-400 focus:border-[#f39a38] focus:bg-white focus:ring-4 focus:ring-[#f39a38]/10"
                    />
                  </div>
                </div>

                {error && (
                  <div
                    role="alert"
                    className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
                  >
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="group relative mt-2 flex h-14 w-full items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-l from-[#0f2f55] via-[#123b69] to-[#0b2442] px-5 font-bold text-white shadow-[0_14px_30px_rgba(16,47,85,0.20)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_34px_rgba(16,47,85,0.27)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                >
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-10 bottom-0 h-px bg-gradient-to-r from-transparent via-[#f49a38] to-transparent"
                  />

                  <span className="absolute left-5 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 transition-transform duration-200 group-hover:-translate-x-1">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      className="h-4 w-4"
                    >
                      <path
                        d="M19 12H5m0 0 5-5m-5 5 5 5"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>

                  {loading
                    ? "جاري تسجيل الدخول..."
                    : "تسجيل الدخول"}
                </button>
              </form>
            </div>
          </div>

          <p className="mt-5 text-center text-xs font-medium text-slate-400">
            TrendX OS • Internal
            Management System
          </p>
        </section>
      </div>
    </main>
  );
}
