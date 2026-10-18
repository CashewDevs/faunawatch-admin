import { splitScientificName } from "../../models/post";

interface ScientificTextProps {
  text: string;
  scientificName: string;
}

/**
 * Plain text with the species' scientific name in italics. Never renders
 * the text as HTML.
 */
export function ScientificText({ text, scientificName }: ScientificTextProps) {
  return splitScientificName(text, scientificName).map((segment, index) =>
    segment.isScientificName ? (
      <em key={index} className="text-deep-blue">
        {segment.text}
      </em>
    ) : (
      segment.text
    ),
  );
}
