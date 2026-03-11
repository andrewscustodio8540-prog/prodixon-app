// test-webhook.js
// Um script simples em Node.js para você testar seu webhook sem precisar do painel do Stripe!

const SUPABASE_FUNCTION_URL = "https://agxpzkvoxdwwxwsdkwnb.supabase.co/functions/v1/smooth-action";
const COMPANY_ID = "ee761be2-5765-4cfb-ba58-070b6cd50485";

async function testSubscriptionSuccess() {
    console.log("🚀 Enviando evento de Pagamento Concluído (Assinatura Ativa)...");

    // Simulando a carga útil (payload) que o Stripe normalmente enviaria
    const mockStripeEvent = {
        type: "checkout.session.completed",
        data: {
            object: {
                client_reference_id: COMPANY_ID,
                customer: "cus_mock123"
            }
        }
    };

    try {
        const response = await fetch(SUPABASE_FUNCTION_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                // Passamos uma assinatura falsa só para a Edge function não dar "crash"
                // NOTA IMPORTANTE: Para isso funcionar, você precisará DESATIVAR a verificação
                // do Stripe no seu index.ts enquanto estiver testando este script local.
            },
            body: JSON.stringify(mockStripeEvent)
        });

        if (response.ok) {
            console.log("✅ Sucesso! O webhook foi chamado e a empresa deve estar ativa no Supabase.");
        } else {
            const err = await response.text();
            console.error("❌ Erro ao chamar webhook:", response.status, err);
        }
    } catch (err) {
        console.error("❌ Falha na conexão:", err.message);
    }
}

testSubscriptionSuccess();
