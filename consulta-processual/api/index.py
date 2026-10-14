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
    # Pega as chaves salvas no painel da Vercel limpando espaços invisíveis
    token_bruto = os.getenv("TELEGRAM_BOT_TOKEN")
    chat_id_bruto = os.getenv("TELEGRAM_CHAT_ID")

    if not token_bruto or not chat_id_bruto:
        raise HTTPException(
            status_code=503, 
            detail="Erro interno: Variáveis de ambiente não configuradas na Vercel."
        )

    token = str(token_bruto).strip()
    chat_id = str(chat_id_bruto).strip()

    # Formatação do link do WhatsApp e texto da mensagem
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

    # ENDEREÇO OFICIAL E CORRETO DA API DO TELEGRAM:
    url_telegram = f"https://api.telegram.org/bot{token}/sendMessage"

    try:
        async with httpx.AsyncClient(timeout=15, trust_env=False) as client:
            resposta = await client.post(
                url_telegram, 
                json={"chat_id": chat_id, "text": mensagem},
                headers={"Content-Type": "application/json"}
            )
        
        resultado = resposta.json()
        
        # Só dá sucesso se o Telegram responder 200 E o campo "ok" for verdadeiro
        if resposta.status_code != 200 or not resultado.get("ok"):
            error_msg = resultado.get("description", "Rejeitado pelo Telegram")
            raise HTTPException(status_code=502, detail=f"Telegram recusou: {error_msg}")
            
        return {"success": True}

    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"Erro na rede do servidor: {str(e)}")
    except HTTPException as http_err:
        raise http_err
    except Exception as erro_geral:
        raise HTTPException(status_code=502, detail=f"Falha inesperada: {str(erro_geral)}")
