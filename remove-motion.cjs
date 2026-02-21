const { Project, SyntaxKind } = require("ts-morph");

const project = new Project({
    tsConfigFilePath: "tsconfig.json",
});

const sourceFiles = project.getSourceFiles();

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

for (const sourceFile of sourceFiles) {
    const fileName = sourceFile.getBaseName();

    const framerImport = sourceFile.getImportDeclaration(decl => decl.getModuleSpecifierValue() === "framer-motion");
    if (!framerImport) continue;

    if (SKIP_FILES.includes(fileName)) {
        console.log(`Skipping high-complexity file: ${fileName}`);
        continue;
    }

    console.log(`Processing ${fileName}...`);
    framerImport.remove();

    const elements = sourceFile.getDescendantsOfKind(SyntaxKind.JsxElement);
    const selfClosingElements = sourceFile.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement);

    const allElements = [...elements, ...selfClosingElements];

    // We process from bottom up (reverse) so that replacing child elements doesn't detach parents
    // Actually getDescendants does preorder traversal. We should just replace text carefully.
    // Actually, AST manipulation in ts-morph is safe if we modify attributes first, then tag name.

    for (const el of allElements) {
        if (el.wasForgotten()) continue; // Skip if parent was replaced

        let tagNameNode;
        let openingElement = el;

        if (el.getKind() === SyntaxKind.JsxElement) {
            openingElement = el.getOpeningElement();
            tagNameNode = openingElement.getTagNameNode();
        } else {
            tagNameNode = el.getTagNameNode();
        }

        const tagName = tagNameNode.getText();

        if (tagName === "AnimatePresence") {
            // For AnimatePresence, replace the whole thing with a Fragment
            if (el.getKind() === SyntaxKind.JsxElement) {
                try {
                    const childrenText = el.getJsxChildren().map(c => c.getText()).join("");
                    el.replaceWithText(`<>\n${childrenText}\n</>`);
                } catch (e) {
                    console.error(`Error replacing AnimatePresence in ${fileName}`);
                }
            } else {
                el.replaceWithText(`<></>`);
            }
            continue;
        }

        if (tagName.startsWith("motion.")) {
            const newTag = tagName.split(".")[1];

            let classesToAdd = [];
            let hasWhileTap = false;
            let hasWhileHover = false;
            let hasInitial = false;

            // Process Attributes
            const attributes = openingElement.getAttributes();
            for (const attr of attributes) {
                if (attr.getKind() === SyntaxKind.JsxAttribute) {
                    const name = attr.getNameNode().getText();
                    if (name === "whileTap") hasWhileTap = true;
                    if (name === "whileHover") hasWhileHover = true;
                    if (name === "initial") hasInitial = true;

                    if (BAD_PROPS.has(name)) {
                        attr.remove();
                    }
                }
            }

            if (hasWhileTap) classesToAdd.push("active:scale-95 transition-transform duration-150");
            if (hasWhileHover) classesToAdd.push("safe-hover-scale transition-transform duration-150");
            if (hasInitial) classesToAdd.push("animate-fadeIn"); // simple default

            if (classesToAdd.length > 0) {
                const classNameAttr = openingElement.getAttribute("className");
                if (!classNameAttr) {
                    openingElement.addAttribute({
                        name: "className",
                        initializer: `"${classesToAdd.join(' ')}"`
                    });
                } else {
                    // Attempt to append to existing className
                    const init = classNameAttr.getInitializer();
                    if (init && init.getKind() === SyntaxKind.StringLiteral) {
                        const val = init.getLiteralText();
                        classNameAttr.setInitializer(`"${val} ${classesToAdd.join(' ')}"`);
                    } else if (init && init.getKind() === SyntaxKind.JsxExpression) {
                        // It's like className={`flex ${isActive ? 'a' : 'b'}`}
                        // We just let it be, the user has to manually fix complex ones, or we can wrap it.
                        // For now, we skip complex className injections to avoid breaking syntax.
                    }
                }
            }

            // Finally, replace the tag name
            if (el.getKind() === SyntaxKind.JsxElement) {
                el.getOpeningElement().getTagNameNode().replaceWithText(newTag);
                const closing = el.getClosingElement();
                if (closing) {
                    closing.getTagNameNode().replaceWithText(newTag);
                }
            } else {
                tagNameNode.replaceWithText(newTag);
            }
        }
    }

    // Remove other hooks like useAnimation, useMotionValue, useSpring, useTransform
    // These are usually named appropriately, but without the import they'll just be undefined variables.
    // We'll let TypeScript (npm run build) catch lingering hooks so we can fix them manually.

    try {
        sourceFile.saveSync();
    } catch (e) {
        console.error(`Error saving ${fileName}:`, e);
    }
}

console.log("Done.");
