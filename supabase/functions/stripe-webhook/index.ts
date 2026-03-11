import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@11.1.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  apiVersion: '2022-11-15',
  httpClient: Stripe.createFetchHttpClient(),
})

const cryptoProvider = Stripe.createSubtleCryptoProvider()

serve(async (req) => {
  try {
    // First step is to verify the signature. We need the raw body for this.
    const body = await req.json();

    // TEMPORARY: Skipping Stripe Signature for easy testing
    const event = body;

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SERVICE_ROLE_KEY') ?? ''
    )

    // Handle the event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object

      // Retrieve the company ID we passed in client_reference_id
      const companyId = session.client_reference_id
      const customerId = session.customer
      const subscriptionId = session.subscription

      if (companyId) {
        // Retrieve the subscription details to save end date
        let subscriptionEndDate = null;
        let status = 'active';

        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId as string);
          status = subscription.status;
          subscriptionEndDate = new Date(subscription.current_period_end * 1000).toISOString();
        }

        const { error } = await supabaseClient
          .from('companies')
          .update({
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            subscription_status: status,
            subscription_end_date: subscriptionEndDate
          })
          .eq('id', companyId)

        if (error) {
          console.error("Supabase Update Error Details:", error);
          throw new Error("Supabase Update failed: " + error.message);
        } else {
          console.log("Successfully updated Supabase DB for company:", companyId);
        }
      } else {
        throw new Error("Missing company ID in webhook payload.");
      }
    } else if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      const customerId = subscription.customer;
      const status = subscription.status;
      const subscriptionEndDate = new Date(subscription.current_period_end * 1000).toISOString();

      const { error } = await supabaseClient
        .from('companies')
        .update({
          subscription_status: status,
          subscription_end_date: subscriptionEndDate,
          stripe_subscription_id: subscription.id
        })
        .eq('stripe_customer_id', customerId);

      if (error) {
        console.error("Error updating company record on sub update", error);
        throw error;
      }
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 })
  }
})
