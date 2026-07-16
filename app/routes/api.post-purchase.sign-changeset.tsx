import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.public.checkout(request);
  return new Response();
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { cors } = await authenticate.public.checkout(request);
  const body: any = await request.json();

  const payload = {
    iss: process.env.SHOPIFY_API_KEY,
    jti: uuidv4(),
    iat: Date.now(),
    sub: body.referenceId,
    changes: body.changes,
  };

  const token = jwt.sign(payload, process.env.SHOPIFY_API_SECRET as string);

  console.log("[post-purchase] signed changeset for referenceId:", body.referenceId);

  return cors(json({ token }));
};
