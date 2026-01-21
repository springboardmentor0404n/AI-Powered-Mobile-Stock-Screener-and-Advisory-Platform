import React from 'react';
import { Text, View, StyleSheet } from 'react-native';

interface MarkdownTextProps {
    text: string;
    style?: any;
    isDark?: boolean;
    isUser?: boolean;
}

export const MarkdownText: React.FC<MarkdownTextProps> = ({ text, style, isDark = false, isUser = false }) => {
    const baseColor = isUser ? '#FFFFFF' : (style?.color || '#000000');

    const renderText = () => {
        if (!text) return null;

        const lines = text.split('\n');
        const elements: React.ReactElement[] = [];
        let key = 0;
        let inTable = false;
        let tableRows: string[][] = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Skip table separators (---, | :--- |, etc.)
            if (line.trim().match(/^[\|\s\-:]+$/)) {
                inTable = true;
                continue;
            }

            // Table row detection
            if (line.includes('|')) {
                const cells = line.split('|').map(cell => cell.trim()).filter(cell => cell);
                if (cells.length > 0) {
                    tableRows.push(cells);
                    inTable = true;
                    continue;
                }
            }

            // If we were in a table and now we're not, render the table
            if (inTable && !line.includes('|')) {
                if (tableRows.length > 0) {
                    elements.push(
                        <View key={key++} style={styles.table}>
                            {tableRows.map((row, rowIndex) => (
                                <View key={`row-${rowIndex}`} style={styles.tableRow}>
                                    {row.map((cell, cellIndex) => (
                                        <Text 
                                            key={`cell-${cellIndex}`} 
                                            style={[
                                                styles.tableCell, 
                                                rowIndex === 0 ? styles.tableHeaderCell : {},
                                                { color: baseColor }
                                            ]}
                                        >
                                            {renderInline(cell)}
                                        </Text>
                                    ))}
                                </View>
                            ))}
                        </View>
                    );
                }
                inTable = false;
                tableRows = [];
            }

            // Empty line
            if (!line.trim()) {
                elements.push(<View key={key++} style={{ height: 8 }} />);
                continue;
            }

            // Headings
            if (line.startsWith('#### ')) {
                elements.push(
                    <Text key={key++} style={[styles.heading4, { color: baseColor }]}>
                        {renderInline(line.substring(5))}
                    </Text>
                );
                continue;
            }
            if (line.startsWith('### ')) {
                elements.push(
                    <Text key={key++} style={[styles.heading3, { color: baseColor }]}>
                        {renderInline(line.substring(4))}
                    </Text>
                );
                continue;
            }
            if (line.startsWith('## ')) {
                elements.push(
                    <Text key={key++} style={[styles.heading2, { color: baseColor }]}>
                        {renderInline(line.substring(3))}
                    </Text>
                );
                continue;
            }
            if (line.startsWith('# ')) {
                elements.push(
                    <Text key={key++} style={[styles.heading1, { color: baseColor }]}>
                        {renderInline(line.substring(2))}
                    </Text>
                );
                continue;
            }

            // Bullet lists (both • and - or *)
            if (line.match(/^[•\*\-]\s/) || line.trim().startsWith('•')) {
                const content = line.replace(/^[•\*\-]\s*/, '').trim();
                elements.push(
                    <View key={key++} style={styles.listItem}>
                        <Text style={[styles.bullet, { color: baseColor }]}>• </Text>
                        <Text style={[styles.text, { color: baseColor, flex: 1 }]}>
                            {renderInline(content)}
                        </Text>
                    </View>
                );
                continue;
            }

            // Regular text with inline formatting
            elements.push(
                <Text key={key++} style={[styles.text, { color: baseColor }]}>
                    {renderInline(line)}
                </Text>
            );
        }

        // Render any remaining table at the end
        if (inTable && tableRows.length > 0) {
            elements.push(
                <View key={key++} style={styles.table}>
                    {tableRows.map((row, rowIndex) => (
                        <View key={`row-${rowIndex}`} style={styles.tableRow}>
                            {row.map((cell, cellIndex) => (
                                <Text 
                                    key={`cell-${cellIndex}`} 
                                    style={[
                                        styles.tableCell, 
                                        rowIndex === 0 ? styles.tableHeaderCell : {},
                                        { color: baseColor }
                                    ]}
                                >
                                    {renderInline(cell)}
                                </Text>
                            ))}
                        </View>
                    ))}
                </View>
            );
        }

        return elements;
    };

    const renderInline = (text: string) => {
        const parts: (string | React.ReactElement)[] = [];
        let partKey = 0;
        let lastIndex = 0;

        // Match bold text (**text**)
        const boldPattern = /\*\*([^*]+?)\*\*/g;
        let match;

        while ((match = boldPattern.exec(text)) !== null) {
            // Add text before bold
            if (match.index > lastIndex) {
                parts.push(text.substring(lastIndex, match.index));
            }
            // Add bold text
            parts.push(
                <Text key={`bold-${partKey++}`} style={styles.bold}>
                    {match[1]}
                </Text>
            );
            lastIndex = match.index + match[0].length;
        }

        // Add remaining text
        if (lastIndex < text.length) {
            parts.push(text.substring(lastIndex));
        }

        return parts.length > 0 ? parts : text;
    };

    return (
        <View>
            {renderText()}
        </View>
    );
};

const styles = StyleSheet.create({
    heading1: {
        fontSize: 20,
        fontWeight: '700',
        marginTop: 8,
        marginBottom: 4,
        lineHeight: 26,
        flexWrap: 'wrap',
    },
    heading2: {
        fontSize: 18,
        fontWeight: '700',
        marginTop: 6,
        marginBottom: 3,
        lineHeight: 24,
        flexWrap: 'wrap',
    },
    heading3: {
        fontSize: 16,
        fontWeight: '700',
        marginTop: 4,
        marginBottom: 2,
        lineHeight: 22,
        flexWrap: 'wrap',
    },
    heading4: {
        fontSize: 14,
        fontWeight: '700',
        marginTop: 3,
        marginBottom: 2,
        lineHeight: 20,
        flexWrap: 'wrap',
    },
    text: {
        fontSize: 15,
        lineHeight: 22,
        marginBottom: 2,
        flexWrap: 'wrap',
    },
    bold: {
        fontWeight: '700',
    },
    bullet: {
        fontSize: 15,
        lineHeight: 22,
        marginRight: 6,
    },
    listItem: {
        flexDirection: 'row',
        marginVertical: 2,
        marginBottom: 4,
        paddingRight: 4,
        flexWrap: 'nowrap',
    },
    table: {
        marginVertical: 8,
        borderWidth: 1,
        borderColor: '#444',
        borderRadius: 4,
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#444',
    },
    tableCell: {
        flex: 1,
        padding: 8,
        fontSize: 14,
        lineHeight: 20,
    },
    tableHeaderCell: {
        fontWeight: '700',
        backgroundColor: 'rgba(100, 100, 100, 0.1)',
    },
});
