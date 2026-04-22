import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

let cachedColleges: any[] | null = null;
let cachedDomains: any[] | null = null;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.toLowerCase() || "";

  if (query.length < 2) {
    return NextResponse.json([]);
  }

  try {
    const collegesPath = path.join(process.cwd(), "src/data/colleges.json");
    const domainsPath = path.join(process.cwd(), "src/data/university_domains.json");

    if (!cachedColleges) {
      console.log("Loading colleges from:", collegesPath);
      if (!fs.existsSync(collegesPath)) throw new Error("colleges.json not found");
      const collegesRaw = fs.readFileSync(collegesPath, "utf-8");
      cachedColleges = JSON.parse(collegesRaw);
      console.log("Loaded", cachedColleges?.length, "colleges");
    }
    
    if (!cachedDomains) {
      console.log("Loading domains from:", domainsPath);
      if (!fs.existsSync(domainsPath)) throw new Error("university_domains.json not found");
      const domainsRaw = fs.readFileSync(domainsPath, "utf-8");
      cachedDomains = JSON.parse(domainsRaw);
      console.log("Loaded", cachedDomains?.length, "domains");
    }

    // Search colleges
    const matches = cachedColleges!.filter((c: any) => 
      c.institute_name && c.institute_name.toLowerCase().includes(query)
    ).slice(0, 10);

    const results = matches.map((c: any) => {
      // Find matching domain from hipolabs data
      const matchedDomain = cachedDomains!.find((d: any) => 
        c.institute_name.toLowerCase().includes(d.name.toLowerCase())
      );

      return {
        name: c.institute_name,
        location: `${c.district || ""}, ${c.state || ""}`.trim().replace(/^,/, ""),
        domain: matchedDomain ? matchedDomain.domains[0] : "",
        university: ""
      };
    });

    return NextResponse.json(results);
  } catch (error: any) {
    console.error("COLLEGE SEARCH ERROR:", error.message);
    return NextResponse.json({ error: error.message || "Failed to load college data" }, { status: 500 });
  }
}

