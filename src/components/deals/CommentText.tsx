import { Link } from 'react-router-dom';

interface CommentTextProps {
    text: string;
}

export function CommentText({ text }: CommentTextProps) {
    // Parse mentions and render as links
    const renderText = () => {
        const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
        const parts: React.ReactNode[] = [];
        let lastIndex = 0;
        let match;

        while ((match = mentionRegex.exec(text)) !== null) {
            // Add text before mention
            if (match.index > lastIndex) {
                parts.push(text.slice(lastIndex, match.index));
            }

            // Add mention as link
            const [fullMatch, name, userId] = match;
            parts.push(
                <Link
                    key={match.index}
                    to={`/profile/${userId}`}
                    className="text-blue-600 font-medium hover:underline"
                >
                    @{name}
                </Link>
            );

            lastIndex = match.index + fullMatch.length;
        }

        // Add remaining text
        if (lastIndex < text.length) {
            parts.push(text.slice(lastIndex));
        }

        return parts;
    };

    return <span>{renderText()}</span>;
}
