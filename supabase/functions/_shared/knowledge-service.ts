export async function fetchKnowledgeContext(supabase: any, companyId: string, categoryId: string | null = null): Promise<{ positive: string; restrictions: string }> {
  try {
    let query = supabase
      .from("knowledge_entries")
      .select("title, content, type, priority, scope, scope_ref")
      .eq("company_id", companyId)
      .eq("ai_visible", true)
      .eq("is_active", true)
      .order("priority", { ascending: false });

    if (categoryId) {
      query = query.or(`scope.eq.global,and(scope.eq.categoria,scope_ref.eq.${categoryId})`);
    } else {
      query = query.eq("scope", "global");
    }

    const { data: entries } = await query;
    if (!entries?.length) return { positive: "", restrictions: "" };

    // Separate by type and scope, ordered: restrictions first, then category positive, then global positive
    const catRestrictions: any[] = [];
    const globalRestrictions: any[] = [];
    const catPositive: any[] = [];
    const globalPositive: any[] = [];

    for (const e of entries) {
      if (e.type === "restriccion") {
        (e.scope === "categoria" ? catRestrictions : globalRestrictions).push(e);
      } else {
        (e.scope === "categoria" ? catPositive : globalPositive).push(e);
      }
    }

    const MAX_CHARS = 4000;
    let totalChars = 0;

    const restrictionLines: string[] = [];
    for (const e of [...catRestrictions, ...globalRestrictions]) {
      const line = `• ${e.title}: ${e.content}`;
      if (totalChars + line.length > MAX_CHARS) break;
      totalChars += line.length;
      restrictionLines.push(line);
    }

    const catPositiveLines: string[] = [];
    for (const e of catPositive) {
      const line = `• ${e.title}: ${e.content}`;
      if (totalChars + line.length > MAX_CHARS) break;
      totalChars += line.length;
      catPositiveLines.push(line);
    }

    const globalPositiveLines: string[] = [];
    for (const e of globalPositive) {
      const line = `• ${e.title}: ${e.content}`;
      if (totalChars + line.length > MAX_CHARS) break;
      totalChars += line.length;
      globalPositiveLines.push(line);
    }

    let positive = "";
    if (catPositiveLines.length) positive += `\n\n--- CONOCIMIENTO DE CATEGORÍA ---\n${catPositiveLines.join('\n')}`;
    if (globalPositiveLines.length) positive += `\n\n--- CONOCIMIENTO DEL NEGOCIO ---\n${globalPositiveLines.join('\n')}`;

    return {
      positive,
      restrictions: restrictionLines.length ? `\n\n--- RESTRICCIONES (NO PROMETER / NO AFIRMAR) ---\n${restrictionLines.join('\n')}` : "",
    };
  } catch (e) {
    console.error("Error fetching knowledge entries:", e);
    return { positive: "", restrictions: "" };
  }
}
