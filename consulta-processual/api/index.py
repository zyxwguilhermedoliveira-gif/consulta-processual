import os
import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI()

class SolicitacaoReal(BaseModel):
    name: str = ""
    cpf: str = ""
    phone: str = ""
    representation: str = ""
    lawyer: str = ""
    defendant: str = ""

@app.post("/api/enviar-solicitacao")
async def enviar_solicitacao(dados: SolicitacaoReal):
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    chat_id = os.getenv("TELEGRAM_CHAT_ID")

    if not token or not chat_id:
        raise HTTPException(status_code=503, detail="Chaves secretas faltando.")

    link_whats = f"https://wa.me{dados.phone}"
    txt_rep = "Defensoria Pública" if dados.representation == "public" else "Advocacia Particular"
    
    mensagem = (
        "📌 NOVO LEAD CAPTURADO!\n\n"
        f"👤 Nome: {dados.name}\n"
        f"🪪 CPF: {dados.cpf}\n"
        f"📱 WhatsApp: {link_whats} ou {dados.phone}\n\n"
        f"⚖️ Representação: {txt_rep}\n"
        f"💼 Advogado: {dados.lawyer or 'Não informado'}\n"
        f"🏢 Parte Processada: {dados.defendant}"
    )

    url = f"https://telegram.org{token}/sendMessage"

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resposta = await client.post(url, json={"chat_id": chat_id, "text": mensagem})
        return {"success": True}
    except:
        raise HTTPException(status_code=502, detail="Erro ao enviar.")
