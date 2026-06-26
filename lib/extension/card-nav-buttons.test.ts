import { describe, expect, it } from "vitest";
import { renderCardNavRow } from "@/src/shared/extension/card-nav-buttons";

describe("renderCardNavRow", () => {
  it("renders all three nav chips in one row when enabled", () => {
    const html = renderCardNavRow({
      showJobInfo: true,
      showResume: true,
      showCover: true,
    });

    expect(html).toContain('class="card-nav-row"');
    expect(html).toContain('style="--es-nav-cols: 3"');
    expect(html).toContain('data-open-job-detail="1"');
    expect(html).toContain('data-open-resume-preview="1"');
    expect(html).toContain('data-open-cover-preview="1"');
    expect(html).toContain("Job Info");
    expect(html).toContain("Resume");
    expect(html).toContain("Cover Letter");
    expect(html.indexOf('data-open-job-detail="1"')).toBeLessThan(
      html.indexOf('data-open-resume-preview="1"'),
    );
    expect(html.indexOf('data-open-resume-preview="1"')).toBeLessThan(
      html.indexOf('data-open-cover-preview="1"'),
    );
  });

  it("renders only job info when review row is hidden", () => {
    const html = renderCardNavRow({
      showJobInfo: true,
      showResume: false,
      showCover: false,
    });

    expect(html).toContain('style="--es-nav-cols: 1"');
    expect(html).toContain('data-open-job-detail="1"');
    expect(html).not.toContain('data-open-resume-preview="1"');
  });
});
