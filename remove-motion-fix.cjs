const { Project, SyntaxKind } = require("ts-morph");

const project = new Project({
    tsConfigFilePath: "tsconfig.json",
});

const sourceFiles = project.getSourceFiles("src/**/*.tsx");

const BAD_PROPS = new Set([
    "initial", "animate", "exit", "transition",
    "whileHover", "whileTap", "whileFocus", "whileDrag",
    "layoutId", "layout", "variants", "custom", "drag", "dragConstraints",
    "dragElastic", "onDragEnd", "onDrag", "dragDirectionLock", "onDirectionLock", "dragTransition"
]);

const SKIP_FILES = [
    "useSwipeToReply.ts",
    "ImagePreviewModal.tsx",
    "TiltedCard.tsx",
    "MobileProductModal.tsx",
    "MessageBubble.tsx",
    "AnimatedList.tsx",
    "checkinIntegration.test.tsx"
];

let modifiedCount = 0;

for (const sourceFile of sourceFiles) {
    const fileName = sourceFile.getBaseName();
    if (SKIP_FILES.includes(fileName)) continue;

    let hasModifications = false;

    // Remove any remaining AnimatePresence
    const animatePresences = sourceFile.getDescendantsOfKind(SyntaxKind.JsxElement)
        .filter(el => el.getOpeningElement().getTagNameNode().getText() === "AnimatePresence");
    const selfClosingAP = sourceFile.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement)
        .filter(el => el.getTagNameNode().getText() === "AnimatePresence");

    for (const ap of animatePresences) {
        if (ap.wasForgotten()) continue;
        const children = ap.getJsxChildren().map(c => c.getText()).join("");
        ap.replaceWithText(`<>\n${children}\n</>`);
        hasModifications = true;
    }
    for (const ap of selfClosingAP) {
        if (ap.wasForgotten()) continue;
        ap.replaceWithText(`<></>`);
        hasModifications = true;
    }

    // Now process all elements again
    const allElements = [
        ...sourceFile.getDescendantsOfKind(SyntaxKind.JsxOpeningElement),
        ...sourceFile.getDescendantsOfKind(SyntaxKind.JsxClosingElement),
        ...sourceFile.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement)
    ];

    for (const el of allElements) {
        if (el.wasForgotten()) continue;
        const tagNameNode = el.getTagNameNode();
        const tagName = tagNameNode.getText();

        if (tagName.startsWith("motion.")) {
            hasModifications = true;
            const newTag = tagName.split(".")[1];

            // If it's opening or self closing, clean up attributes
            if (el.getKind() !== SyntaxKind.JsxClosingElement) {
                const attributes = el.getAttributes();
                let classesToAdd = [];
                let hasWhileTap = false;
                let hasWhileHover = false;

                for (const attr of attributes) {
                    if (attr.getKind() === SyntaxKind.JsxAttribute) {
                        const name = attr.getNameNode().getText();
                        if (name === "whileTap") hasWhileTap = true;
                        if (name === "whileHover") hasWhileHover = true;

                        if (BAD_PROPS.has(name)) {
                            attr.remove();
                        }
                    }
                }

                if (hasWhileTap) classesToAdd.push("active:scale-95 transition-transform duration-150");
                if (hasWhileHover) classesToAdd.push("safe-hover-scale transition-transform duration-150");

                if (classesToAdd.length > 0) {
                    const classNameAttr = el.getAttribute("className");
                    if (!classNameAttr) {
                        el.addAttribute({
                            name: "className",
                            initializer: `"${classesToAdd.join(' ')}"`
                        });
                    } else {
                        // Very naive approach: If it's a string literal, we append
                        const init = classNameAttr.getInitializer();
                        if (init && init.getKind() === SyntaxKind.StringLiteral) {
                            const val = init.getLiteralText();
                            classNameAttr.setInitializer(`"${val} ${classesToAdd.join(' ')}"`);
                        }
                    }
                }
            }

            // Finally change tag name
            tagNameNode.replaceWithText(newTag);
        }
    }

    if (hasModifications) {
        console.log(`Fixed ${fileName}`);
        modifiedCount++;
        sourceFile.saveSync();
    }
}

console.log(`Done. Fixed ${modifiedCount} files.`);
