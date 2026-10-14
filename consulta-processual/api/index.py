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
    # Inserção direta e fixa das credenciais para eliminar o bug de leitura da Vercel
    token = "8698708674:AAHbhTIHReAXDcNJKEmwqv_InQ_JAPlmnVws"
    chat_id = "8323693378"

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

    # Monta o link de envio direto
    url = f"https://telegram.org{token}/sendMessage"

    try:
        # trust_env=False força o cliente HTTP a ignorar qualquer configuração de rede da Vercel
        async with httpx.AsyncClient(timeout=15, trust_env=False) as client:
            resposta = await client.post(
                url, 
                json={"chat_id": chat_id, "text": mensagem},
                headers={"Content-Type": "application/json"}
            )
        
        if resposta.status_code != 200:
            raise HTTPException(status_code=502, detail=f"Erro do Telegram: {resposta.text}")
            
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Falha de conexão: {str(e)}")
