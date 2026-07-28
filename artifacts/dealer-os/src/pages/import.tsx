import { useState, useCallback } from "react";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { useBulkImportListings } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UploadCloud, CheckCircle2, AlertCircle, Loader2, ArrowRight, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const REQUIRED_FIELDS = [
  { key: "title", label: "Title" },
  { key: "base_price_cash", label: "Base Price (Cash)" },
  { key: "category", label: "Category" },
  { key: "location", label: "Location" },
] as const;

type FieldKey = typeof REQUIRED_FIELDS[number]["key"];

type Step = "upload" | "mapping" | "submitting" | "result";

function parseCsvPreview(raw: string): { headers: string[]; rows: string[][] } {
  const lines = raw.split(/\r?\n/).filter(Boolean);
  if (!lines.length) return { headers: [], rows: [] };
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
  const rows = lines
    .slice(1, 6)
    .map(line => line.split(",").map(c => c.trim().replace(/^"|"$/g, "")));
  return { headers, rows };
}

export default function ImportPage() {
  const { toast } = useToast();
  const importMutation = useBulkImportListings();

  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [csvPreview, setCsvPreview] = useState<{ headers: string[]; rows: string[][] }>({ headers: [], rows: [] });
  const [mapping, setMapping] = useState<Partial<Record<FieldKey, string>>>({});

  const handleFile = useCallback((f: File) => {
    if (!f.name.endsWith(".csv") && f.type !== "text/csv") {
      toast({ title: "Invalid file", description: "Please upload a .csv file", variant: "destructive" });
      return;
    }
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const preview = parseCsvPreview(text);
      setCsvPreview(preview);
      // Auto-map if header names match expected fields exactly (case-insensitive)
      const autoMap: Partial<Record<FieldKey, string>> = {};
      for (const field of REQUIRED_FIELDS) {
        const match = preview.headers.find(h => h.toLowerCase() === field.key.toLowerCase() || h.toLowerCase() === field.label.toLowerCase());
        if (match) autoMap[field.key] = match;
      }
      setMapping(autoMap);
    };
    reader.readAsText(f);
  }, [toast]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) handleFile(dropped);
  }, [handleFile]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    if (picked) handleFile(picked);
  };

  const handleSubmit = () => {
    if (!file) return;
    setStep("submitting");

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;

      // Build a reverse map: sourceHeader -> targetField
      const headerRemap: Record<string, string> = {};
      for (const [targetField, sourceHeader] of Object.entries(mapping)) {
        if (sourceHeader) headerRemap[sourceHeader] = targetField;
      }

      // Apply mapping: rename CSV headers to API field names
      const lines = text.split(/\r?\n/);
      const originalHeaders = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
      const remappedHeaders = originalHeaders.map(h => headerRemap[h] ?? h);
      const remappedCsv = [
        remappedHeaders.join(","),
        ...lines.slice(1),
      ].join("\n");

      // API client expects a raw Blob with Content-Type: text/csv
      const csvBlob = new Blob([remappedCsv], { type: "text/csv" });
      importMutation.mutate(
        { data: csvBlob },
        {
          onSuccess: () => setStep("result"),
          onError: (err: any) => {
            toast({ title: "Import failed", description: err?.message ?? "Check CSV format.", variant: "destructive" });
            setStep("mapping");
          },
        }
      );
    };
    reader.readAsText(file);
  };

  const reset = () => {
    setStep("upload");
    setFile(null);
    setCsvPreview({ headers: [], rows: [] });
    setMapping({});
    importMutation.reset();
  };

  const mappedCount = Object.values(mapping).filter(Boolean).length;
  const result = importMutation.data?.data;

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Bulk Import</h1>
          <p className="text-muted-foreground mt-2">Upload a CSV to quickly add hundreds of listings at once.</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 text-sm">
          {(["upload", "mapping", "submitting", "result"] as Step[]).map((s, i) => {
            const labels: Record<Step, string> = { upload: "Upload", mapping: "Map Columns", submitting: "Import", result: "Result" };
            const idx = ["upload", "mapping", "submitting", "result"].indexOf(step);
            const done = i < idx;
            const active = s === step;
            return (
              <div key={s} className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${active ? "bg-primary text-white" : done ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                  <span>{i + 1}. {labels[s]}</span>
                </div>
                {i < 3 && <span className="text-muted-foreground/40">→</span>}
              </div>
            );
          })}
        </div>

        {/* Step 1: Upload */}
        {step === "upload" && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Upload CSV</CardTitle>
              <CardDescription>Your CSV should include columns for title, price, category, and location.</CardDescription>
            </CardHeader>
            <CardContent>
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => document.getElementById("csv-upload")?.click()}
                className={`border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${isDragging ? "border-primary bg-primary/5" : "border-border hover:bg-muted/30"}`}
                data-testid="drop-zone"
              >
                <input type="file" id="csv-upload" accept=".csv" className="hidden" onChange={handleFileInput} />
                <UploadCloud className={`w-12 h-12 mb-4 ${file ? "text-primary" : "text-muted-foreground"}`} />
                {file ? (
                  <>
                    <h3 className="text-lg font-medium text-foreground mb-1">{file.name}</h3>
                    <p className="text-sm text-muted-foreground">{(file.size / 1024).toFixed(1)} KB — {csvPreview.headers.length} columns detected</p>
                  </>
                ) : (
                  <>
                    <h3 className="text-lg font-medium text-foreground mb-1">Click or drag a CSV here</h3>
                    <p className="text-sm text-muted-foreground">Supports CSV files only</p>
                  </>
                )}
              </div>
              <div className="mt-6 flex justify-end">
                <Button
                  disabled={!file}
                  className="bg-primary text-white hover:bg-primary/90"
                  onClick={() => setStep("mapping")}
                  data-testid="btn-next-mapping"
                >
                  Next: Map Columns
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Column Mapping */}
        {step === "mapping" && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Map Columns</CardTitle>
              <CardDescription>Match your CSV headers to the fields BANCO expects.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {REQUIRED_FIELDS.map((field) => (
                  <div key={field.key} className="grid gap-2">
                    <label className="text-sm font-medium text-foreground">
                      {field.label}
                      <span className="text-primary ml-1">*</span>
                    </label>
                    <Select
                      value={mapping[field.key] ?? "__none__"}
                      onValueChange={(v) => setMapping(m => ({ ...m, [field.key]: v === "__none__" ? undefined : v }))}
                    >
                      <SelectTrigger className="border-border bg-input" data-testid={`map-${field.key}`}>
                        <SelectValue placeholder="Select CSV column…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— Not mapped —</SelectItem>
                        {csvPreview.headers.map((h) => (
                          <SelectItem key={h} value={h}>{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>

              {/* CSV Preview */}
              {csvPreview.rows.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Preview (first {csvPreview.rows.length} rows)</p>
                  <div className="overflow-x-auto rounded border border-border">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-muted/50">
                          {csvPreview.headers.map((h) => (
                            <th key={h} className="px-3 py-2 text-left text-muted-foreground font-medium whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {csvPreview.rows.map((row, i) => (
                          <tr key={i} className="border-t border-border hover:bg-muted/20">
                            {row.map((cell, j) => (
                              <td key={j} className="px-3 py-2 text-foreground/80 whitespace-nowrap max-w-[160px] truncate">{cell}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <Button variant="outline" className="border-border" onClick={() => setStep("upload")}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">{mappedCount}/{REQUIRED_FIELDS.length} fields mapped</span>
                  <Button
                    className="bg-primary text-white hover:bg-primary/90"
                    onClick={handleSubmit}
                    data-testid="btn-submit-import"
                  >
                    Import Listings
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Submitting */}
        {step === "submitting" && (
          <Card className="bg-card border-border">
            <CardContent className="h-48 flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <p className="text-muted-foreground">Importing your listings…</p>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Result */}
        {step === "result" && result && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                Import Complete
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted p-4 rounded-lg border border-border" data-testid="result-success">
                  <div className="text-sm text-muted-foreground">Successfully Imported</div>
                  <div className="text-2xl font-bold text-green-500">{result.success_count ?? 0}</div>
                </div>
                <div className="bg-muted p-4 rounded-lg border border-border" data-testid="result-failed">
                  <div className="text-sm text-muted-foreground">Failed Rows</div>
                  <div className="text-2xl font-bold text-destructive">{result.failed_count ?? 0}</div>
                </div>
              </div>

              {result.errors && result.errors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2 text-foreground">
                    <AlertCircle className="w-4 h-4 text-destructive" />
                    Error Log
                  </h4>
                  <div className="bg-muted border border-border rounded-lg p-4 max-h-64 overflow-y-auto space-y-1">
                    {result.errors.map((err, i) => (
                      <div key={i} className="text-sm text-muted-foreground py-1 border-b border-border/50 last:border-0">
                        <span className="text-foreground font-medium">Batch {err.batch_index}</span>
                        {err.rows_in_batch ? <span className="text-muted-foreground"> ({err.rows_in_batch} rows)</span> : null}
                        {err.message ? <span>: {err.message}</span> : null}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <Button variant="outline" onClick={reset} data-testid="btn-import-again">Upload Another File</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </SidebarLayout>
  );
}
