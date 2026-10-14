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
    # Pega os valores salvos nas variáveis de ambiente da Vercel
    token_bruto = os.getenv("TELEGRAM_BOT_TOKEN")
    chat_id_bruto = os.getenv("TELEGRAM_CHAT_ID")

    if not token_bruto or not chat_id_bruto:
        raise HTTPException(status_code=503, detail="Chaves secretas faltando.")

    # Remove qualquer espaço invisível ou quebra de linha que possa ter vindo junto
    token = str(token_bruto).strip()
    chat_id = str(chat_id_bruto).strip()

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

    # Monta a URL garantindo que o token seja lido como um texto puro e limpo
    url = f"https://telegram.org{token}/sendMessage"

    try:
        # Forçamos o cliente a ignorar qualquer erro de leitura de porta na URL
        async with httpx.AsyncClient(timeout=15, trust_env=False) as client:
            resposta = await client.post(
                url, 
                json={"chat_id": chat_id, "text": mensaje},
                headers={"Content-Type": "application/json"}
            )
        
        if resposta.status_code != 200:
            raise HTTPException(status_code=502, detail=f"Erro do Telegram: {resposta.text}")
            
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Falha de conexão: {str(e)}")
