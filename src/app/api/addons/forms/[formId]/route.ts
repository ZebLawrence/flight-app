import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, FORM_SUBMISSION_RATE_LIMIT } from '@/lib/rate-limit';
import { getTenantByHost } from '@/lib/db/queries/tenants';
import { getTenantAddons } from '@/lib/db/queries/addons';

interface FormFieldConfig {
  name: string;
  required?: boolean;
}

interface FormConfig {
  recipientEmail?: string;
  successRedirect?: string;
  fields?: FormFieldConfig[];
}

interface FormsAddonConfig {
  forms?: Record<string, FormConfig>;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { formId: string } },
): Promise<NextResponse> {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';

  const rateLimitResult = checkRateLimit(ip, FORM_SUBMISSION_RATE_LIMIT);
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      {
        status: 429,
        headers: { 'Retry-After': String(rateLimitResult.retryAfterSeconds) },
      },
    );
  }

  const host = request.headers.get('host') ?? '';
  const tenant = await getTenantByHost(host);
  if (!tenant) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
  }

  const addonConfigs = await getTenantAddons(tenant.id);
  const formsAddonConfig = addonConfigs.find((c) => c.addonKey === 'forms');

  if (!formsAddonConfig || !formsAddonConfig.enabled) {
    return NextResponse.json(
      { error: 'Forms addon not enabled for this tenant' },
      { status: 403 },
    );
  }

  const { formId } = params;
  const config = formsAddonConfig.config as FormsAddonConfig;
  const formDef = config.forms?.[formId];

  if (!formDef) {
    return NextResponse.json({ error: 'Form not found' }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const missingFields = (formDef.fields ?? [])
    .filter((f) => f.required && !body[f.name])
    .map((f) => f.name);

  if (missingFields.length > 0) {
    return NextResponse.json(
      { error: 'Missing required fields', fields: missingFields },
      { status: 400 },
    );
  }

  console.log(
    `[Forms] Submission for form "${formId}" on tenant "${tenant.slug}":`,
    body,
  );

  if (formDef.recipientEmail) {
    console.log(`[Forms] Would send email to: ${formDef.recipientEmail}`);
  }

  return NextResponse.json({ success: true });
}
