import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Download, Pencil, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  component: CertificatePage,
});

const CERTIFICATE_IMAGE = "/certificado-base.png";
const CERT_W = 1491;
const CERT_H = 1055;

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

function CertificatePage() {
  const [name, setName] = useState("");
  const [issuedName, setIssuedName] = useState("");
  const [imageReady, setImageReady] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const date = useMemo(() => formatDate(new Date()), []);
  const normalizedName = name.trim().replace(/\s+/g, " ").toLocaleUpperCase("pt-BR");
  const issuedDate = date;

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

        // Limpa somente a área do placeholder "NOME DO ALUNO", preservando a linha inferior.
        const nameX = 300;
        const nameY = 505;
        const nameW = 850;
        const nameH = 105;
        const gradient = ctx.createLinearGradient(nameX, nameY, nameX + nameW, nameY);
        gradient.addColorStop(0, "#f7f8fa");
        gradient.addColorStop(0.55, "#fbfbfc");
        gradient.addColorStop(1, "#f6f7f8");
        ctx.fillStyle = gradient;
        ctx.fillRect(nameX, nameY, nameW, nameH);

        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#071526";
        const fontSize = fitFont(ctx, targetName, 800);
        ctx.font = `700 ${fontSize}px Georgia, "Times New Roman", serif`;
        ctx.fillText(targetName, CERT_W / 2, 557);

        // Data atual: apaga apenas os traços do modelo e escreve a data na mesma linha de "Data:".
        // Isso evita a data ficar "flutuando" acima dos campos originais.
        const dateX = 520;
        const dateY = 902;
        const dateW = 300;
        const dateH = 52;

        // Usa um recorte do próprio fundo claro do certificado para cobrir os traços,
        // preservando a aparência do papel sem criar um retângulo branco evidente.
        ctx.drawImage(
          image,
          520, 842, dateW, dateH,
          dateX, dateY - 34, dateW, dateH
        );

        ctx.fillStyle = "#111827";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.font = '400 28px Georgia, "Times New Roman", serif';
        ctx.fillText(issuedDate, dateX, dateY);

        resolve(canvas);
      };
      image.onerror = () => {
        setImageReady(false);
        reject(new Error("Imagem base do certificado não encontrada"));
      };
    });

  useEffect(() => {
    if (!issuedName) return;
    drawCertificate().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issuedName]);

  const generate = () => {
    if (normalizedName.length < 3) return;
    setIssuedName(normalizedName);
    setTimeout(() => {
      document.getElementById("certificate-preview")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 80);
  };

  const downloadPng = async () => {
    try {
      const canvas = await drawCertificate();
      const link = document.createElement("a");
      const safeName = issuedName
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      link.download = `certificado-lavajato-do-diogo-${safeName}.png`;
      link.href = canvas.toDataURL("image/png", 1);
      link.click();
    } catch {
      alert("Não foi possível gerar o certificado. Confira se a imagem base está em public/certificado-base.png.");
    }
  };

  return (
    <main className="min-h-screen bg-[#07101c] text-white">
      <section className="relative overflow-hidden border-b border-blue-500/15">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,102,255,0.24),transparent_38%),radial-gradient(circle_at_bottom_left,rgba(0,82,204,0.16),transparent_32%)]" />
        <div className="relative mx-auto flex min-h-[52vh] max-w-6xl flex-col items-center justify-center px-5 py-16 text-center sm:px-8">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-400/25 bg-blue-500/10 px-4 py-2 text-sm font-semibold text-blue-200">
            <Sparkles className="h-4 w-4" />
            Lavajato do Diogo
          </div>

          <h1 className="max-w-4xl text-4xl font-black tracking-tight sm:text-6xl">
            Emita seu Certificado de Conclusão
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
            Digite seu nome completo exatamente como deseja que apareça no certificado.
            A data de emissão será preenchida automaticamente.
          </p>

          <div className="mt-9 w-full max-w-xl rounded-3xl border border-white/10 bg-white/[0.06] p-4 shadow-2xl shadow-blue-950/30 backdrop-blur sm:p-5">
            <label htmlFor="full-name" className="mb-2 block text-left text-sm font-semibold text-slate-200">
              Nome completo
            </label>
            <input
              id="full-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") generate();
              }}
              placeholder="Ex.: João da Silva"
              autoComplete="name"
              maxLength={70}
              className="h-14 w-full rounded-2xl border border-white/10 bg-[#0d1725] px-4 text-base text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15"
            />
            <button
              onClick={generate}
              disabled={normalizedName.length < 3}
              className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-base font-black tracking-wide text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <CheckCircle2 className="h-5 w-5" />
              GERAR CERTIFICADO
            </button>
          </div>
        </div>
      </section>

      {issuedName && (
        <section id="certificate-preview" className="mx-auto max-w-7xl px-4 py-12 sm:px-8 sm:py-16">
          <div className="mb-6 text-center">
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-blue-400">Certificado pronto</p>
            <h2 className="mt-2 text-2xl font-black sm:text-3xl">Confira seus dados antes de baixar</h2>
          </div>

          {!imageReady && (
            <div className="mx-auto mb-6 max-w-3xl rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-center text-sm text-amber-100">
              A imagem base ainda não foi adicionada ao projeto. Coloque o arquivo final em
              <strong> public/certificado-base.png</strong>.
            </div>
          )}

          <div className="mx-auto overflow-hidden rounded-2xl border border-white/10 bg-white shadow-2xl shadow-black/40">
            <canvas ref={canvasRef} className="block h-auto w-full" aria-label="Prévia do certificado" />
          </div>

          <div className="mx-auto mt-7 grid max-w-3xl gap-3 sm:grid-cols-2">
            <button
              onClick={() => {
                setIssuedName("");
                setTimeout(() => document.getElementById("full-name")?.focus(), 50);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="flex h-14 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-5 font-bold text-white transition hover:bg-white/10"
            >
              <Pencil className="h-5 w-5" />
              CORRIGIR NOME
            </button>
            <button
              onClick={downloadPng}
              className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 font-black text-white transition hover:bg-blue-500"
            >
              <Download className="h-5 w-5" />
              BAIXAR CERTIFICADO
            </button>
          </div>

          <p className="mt-4 text-center text-sm text-slate-400">
            Emitido em {date}. Verifique seu nome antes de fazer o download.
          </p>
        </section>
      )}

      <footer className="border-t border-white/10 px-5 py-7 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} Lavajato do Diogo
      </footer>
    </main>
  );
}
