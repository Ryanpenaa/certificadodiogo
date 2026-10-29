import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  Download,
  Loader2,
  Mail,
  Pencil,
  Search,
  Sparkles,
  MessageCircle,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Emitir certificado | Lavajato do Diogo" },
      { name: "description", content: "Acesse e emita seu certificado de conclusão do Lavajato do Diogo." },
      { property: "og:title", content: "Emitir certificado | Lavajato do Diogo" },
      { property: "og:description", content: "Acesse e emita seu certificado de conclusão do Lavajato do Diogo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CertificatePage,
});

const CERTIFICATE_IMAGE = "/certificado-base.png";
const CERT_W = 1491;
const CERT_H = 1055;
const API_URL = "https://vlyiwlbidoabsfuqtxjk.supabase.co/functions/v1/certificate-api";
const SUPPORT_URL =
  "https://wa.me/5521971718501?text=Ol%C3%A1%2C%20preciso%20de%20ajuda%20com%20meu%20certificado%20do%20Lavajato%20do%20Diogo.";

type Access = {
  id: string;
  email: string;
  name: string;
  correctionsUsed: number;
  correctionsRemaining: number;
  issued: boolean;
  admin?: boolean;
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Manaus",
  }).format(date);
}

function fitFont(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  let size = 78;
  while (size > 34) {
    ctx.font = `700 ${size}px Georgia, "Times New Roman", serif`;
    if (ctx.measureText(text).width <= maxWidth) return size;
    size -= 2;
  }
  return size;
}

async function callApi(body: Record<string, unknown>) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data?.error || "request_failed") as Error & { code?: string };
    error.code = data?.error;
    throw error;
  }
  return data;
}

function CertificatePage() {
  const [email, setEmail] = useState("");
  const [access, setAccess] = useState<Access | null>(null);
  const [editName, setEditName] = useState("");
  const [editing, setEditing] = useState(false);
  const [issuedName, setIssuedName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const date = useMemo(() => formatDate(new Date()), []);

  const drawCertificate = (targetName = issuedName) =>
    new Promise<HTMLCanvasElement>((resolve, reject) => {
      const canvas = canvasRef.current;
      if (!canvas) return reject(new Error("Canvas indisponível"));
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas indisponível"));

      const image = new Image();
      image.src = CERTIFICATE_IMAGE;
      image.onload = () => {
        canvas.width = CERT_W;
        canvas.height = CERT_H;
        ctx.drawImage(image, 0, 0, CERT_W, CERT_H);

        const name = targetName.trim().replace(/\s+/g, " ").toLocaleUpperCase("pt-BR");
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#071526";
        const fontSize = fitFont(ctx, name, 800);
        ctx.font = `700 ${fontSize}px Georgia, "Times New Roman", serif`;
        ctx.fillText(name, CERT_W / 2, 555);

        ctx.fillStyle = "#111827";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.font = '400 29px Georgia, "Times New Roman", serif';
        ctx.fillText(date, 515, 902);

        resolve(canvas);
      };
      image.onerror = () => reject(new Error("Imagem base não encontrada"));
    });

  const findPurchase = async () => {
    const clean = email.trim().toLowerCase();
    if (!clean || !clean.includes("@")) {
      setMessage("Digite o mesmo e-mail utilizado na compra.");
      return;
    }

    setLoading(true);
    setMessage("");
    setIssuedName("");
    try {
      const data = await callApi({ action: "lookup", email: clean });
      const found = data.access as Access;
      setAccess(found);
      setEditName(found.name);
      setEditing(Boolean(found.admin));
    } catch (error) {
      const code = (error as Error & { code?: string }).code;
      if (code === "not_found") {
        setMessage("Não encontramos uma compra aprovada para este e-mail.");
      } else {
        setMessage("Não foi possível consultar seu acesso agora. Tente novamente.");
      }
    } finally {
      setLoading(false);
    }
  };

  const saveCorrection = async () => {
    if (!access) return;
    const cleanName = editName.trim().replace(/\s+/g, " ");
    if (cleanName.length < 3) {
      setMessage("Digite seu nome completo.");
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      const data = await callApi({
        action: "update_name",
        id: access.id,
        email: access.email,
        name: cleanName,
      });

      setAccess({
        ...access,
        name: data.name,
        correctionsUsed: data.correctionsUsed,
        correctionsRemaining: data.correctionsRemaining,
      });
      setEditName(data.name);
      setEditing(false);
      setIssuedName("");
      setMessage("Nome atualizado com sucesso.");
    } catch (error) {
      const code = (error as Error & { code?: string }).code;
      if (code === "correction_limit") {
        setMessage("Você já utilizou as 2 correções permitidas. Fale com nosso suporte.");
      } else {
        setMessage("Não foi possível corrigir o nome. Tente novamente.");
      }
    } finally {
      setLoading(false);
    }
  };

  const issueCertificate = async () => {
    if (!access) return;

    const certificateName = access.admin
      ? editName.trim().replace(/\s+/g, " ")
      : access.name;

    if (certificateName.length < 3) {
      setMessage("Digite o nome completo que deve aparecer no certificado.");
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      await callApi({ action: "issue", id: access.id, email: access.email });
      setIssuedName(certificateName);
      setAccess({ ...access, name: certificateName, issued: true });
      setTimeout(() => {
        drawCertificate(certificateName).catch(() => undefined);
        document.getElementById("certificate-preview")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 50);
    } catch {
      setMessage("Não foi possível emitir o certificado agora. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const downloadPdf = async () => {
    try {
      const canvas = await drawCertificate();
      const { jsPDF } = await import("jspdf");
      const safeName = issuedName
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "px",
        format: [CERT_W, CERT_H],
        hotfixes: ["px_scaling"],
        compress: true,
      });

      const imageData = canvas.toDataURL("image/jpeg", 0.97);
      pdf.addImage(imageData, "JPEG", 0, 0, CERT_W, CERT_H, undefined, "FAST");
      pdf.save(`certificado-lavajato-do-diogo-${safeName}.pdf`);
    } catch {
      setMessage("Não foi possível gerar o PDF. Tente novamente.");
    }
  };

  return (
    <main className="min-h-screen bg-[#07101c] text-white">
      <section className="relative overflow-hidden border-b border-blue-500/15">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,102,255,0.24),transparent_38%),radial-gradient(circle_at_bottom_left,rgba(0,82,204,0.16),transparent_32%)]" />
        <div className="relative mx-auto flex min-h-[58vh] max-w-6xl flex-col items-center justify-center px-5 py-16 text-center sm:px-8">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-400/25 bg-blue-500/10 px-4 py-2 text-sm font-semibold text-blue-200">
            <Sparkles className="h-4 w-4" />
            Lavajato do Diogo
          </div>

          <h1 className="max-w-4xl text-4xl font-black tracking-tight sm:text-6xl">
            Emita seu Certificado de Conclusão
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
            Informe o mesmo e-mail utilizado na compra. Seu nome será carregado automaticamente
            com os dados recebidos da Cakto.
          </p>

          {!access && (
            <div className="mt-9 w-full max-w-xl rounded-3xl border border-white/10 bg-white/[0.06] p-4 shadow-2xl shadow-blue-950/30 backdrop-blur sm:p-5">
              <label htmlFor="purchase-email" className="mb-2 block text-left text-sm font-semibold text-slate-200">
                E-mail utilizado na compra
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                <input
                  id="purchase-email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && findPurchase()}
                  placeholder="seuemail@exemplo.com"
                  type="email"
                  autoComplete="email"
                  className="h-14 w-full rounded-2xl border border-white/10 bg-[#0d1725] pl-12 pr-4 text-base text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15"
                />
              </div>
              <button
                onClick={findPurchase}
                disabled={loading}
                className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-base font-black tracking-wide text-white transition hover:bg-blue-500 disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                ACESSAR MEU CERTIFICADO
              </button>
            </div>
          )}

          {access && (
            <div className="mt-9 w-full max-w-2xl rounded-3xl border border-white/10 bg-white/[0.06] p-5 text-left shadow-2xl shadow-blue-950/30 backdrop-blur sm:p-6">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-400" />
                <div>
                  <p className="font-bold text-white">{access.admin ? "Acesso administrador" : "Compra localizada"}</p>
                  <p className="mt-1 text-sm text-slate-400">{access.email}</p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-white/10 bg-[#0d1725] p-4">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Nome do certificado</p>
                {access.admin ? (
                  <div className="mt-3">
                    <input
                      value={editName}
                      onChange={(event) => setEditName(event.target.value)}
                      maxLength={70}
                      placeholder="Digite qualquer nome para emitir"
                      className="h-12 w-full rounded-xl border border-blue-500/30 bg-[#07101c] px-4 text-white outline-none focus:border-blue-500"
                    />
                    <p className="mt-3 text-sm text-blue-300">
                      Modo administrador: você pode emitir quantos certificados precisar.
                    </p>
                  </div>
                ) : editing ? (
                  <div className="mt-3">
                    <input
                      value={editName}
                      onChange={(event) => setEditName(event.target.value)}
                      maxLength={70}
                      className="h-12 w-full rounded-xl border border-white/10 bg-[#07101c] px-4 text-white outline-none focus:border-blue-500"
                    />
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => {
                          setEditName(access.name);
                          setEditing(false);
                        }}
                        className="h-11 flex-1 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-bold"
                      >
                        CANCELAR
                      </button>
                      <button
                        onClick={saveCorrection}
                        disabled={loading}
                        className="h-11 flex-1 rounded-xl bg-blue-600 px-4 text-sm font-black disabled:opacity-50"
                      >
                        SALVAR CORREÇÃO
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="mt-2 text-xl font-black uppercase tracking-wide text-white">{access.name}</p>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <span className="text-sm text-slate-400">
                        Correções disponíveis: <strong className="text-white">{access.correctionsRemaining}</strong> de 2
                      </span>
                      <button
                        onClick={() => setEditing(true)}
                        disabled={access.correctionsRemaining <= 0}
                        className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Pencil className="h-4 w-4" />
                        CORRIGIR NOME
                      </button>
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={issueCertificate}
                disabled={loading || (!access.admin && editing) || (access.admin && editName.trim().length < 3)}
                className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-base font-black tracking-wide transition hover:bg-blue-500 disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
                EMITIR CERTIFICADO
              </button>

              <button
                onClick={() => {
                  setAccess(null);
                  setIssuedName("");
                  setMessage("");
                }}
                className="mt-3 w-full text-center text-sm font-semibold text-slate-400 hover:text-white"
              >
                Usar outro e-mail
              </button>
            </div>
          )}

          {message && (
            <div className="mt-5 max-w-xl rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
              {message}
            </div>
          )}
        </div>
      </section>

      {issuedName && (
        <section id="certificate-preview" className="mx-auto max-w-7xl px-4 py-12 sm:px-8 sm:py-16">
          <div className="mb-6 text-center">
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-blue-400">Certificado emitido</p>
            <h2 className="mt-2 text-2xl font-black sm:text-3xl">Seu certificado está pronto</h2>
          </div>

          <div className="mx-auto overflow-hidden rounded-2xl border border-white/10 bg-white shadow-2xl shadow-black/40">
            <canvas ref={canvasRef} className="block h-auto w-full" aria-label="Prévia do certificado" />
          </div>

          <div className="mx-auto mt-7 max-w-xl">
            <button
              onClick={downloadPdf}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 font-black text-white transition hover:bg-blue-500"
            >
              <Download className="h-5 w-5" />
              BAIXAR CERTIFICADO EM PDF
            </button>
            <p className="mt-4 text-center text-sm text-slate-400">
              Emitido em {date}.
            </p>
          </div>
        </section>
      )}

      <section className="border-t border-white/10 bg-[#050b13] px-5 py-10 text-center">
        <p className="text-sm text-slate-400">Teve qualquer problema para localizar ou emitir seu certificado?</p>
        <a
          href={SUPPORT_URL}
          target="_blank"
          rel="noreferrer"
          className="mx-auto mt-4 inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 font-black text-white transition hover:bg-emerald-500"
        >
          <MessageCircle className="h-5 w-5" />
          FALAR COM O SUPORTE
        </a>
      </section>

      <footer className="border-t border-white/10 px-5 py-7 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} Lavajato do Diogo
      </footer>

      <a
        href={SUPPORT_URL}
        target="_blank"
        rel="noreferrer"
        aria-label="Suporte pelo WhatsApp"
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 shadow-xl shadow-black/30 transition hover:scale-105 hover:bg-emerald-500"
      >
        <MessageCircle className="h-7 w-7" />
      </a>
    </main>
  );
}
