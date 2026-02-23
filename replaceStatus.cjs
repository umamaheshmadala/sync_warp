const fs = require('fs');
const path = require('path');

const storiesDir = path.join(__dirname, 'docs', 'stories');
const epicsDir = path.join(__dirname, 'docs', 'epics');

const checkFiles = [
    path.join(epicsDir, 'EPIC_14_Energy_Battery_Resource_Efficiency.md'),
    path.join(storiesDir, 'STORY_14.1_Consolidate_Triple_Presence.md'),
    path.join(storiesDir, 'STORY_14.2_Consolidate_Quad_Heartbeat.md'),
    path.join(storiesDir, 'STORY_14.3_Replace_Backdrop_Blur_Mobile.md'),
    path.join(storiesDir, 'STORY_14.4_Convert_SetInterval_To_SetTimeout.md'),
    path.join(storiesDir, 'STORY_14.5_Fix_Uncleaned_Event_Listeners.md'),
    path.join(storiesDir, 'STORY_14.6_Remove_PresenceService_AutoStart.md'),
    path.join(storiesDir, 'STORY_14.7_WillChange_And_GlassCard_Default.md'),
    path.join(storiesDir, 'STORY_14.8_Lazy_Load_Images.md'),
    path.join(storiesDir, 'STORY_14.9_Reduce_Campaign_Poll_ProfileCompletion.md')
];

for (const file of checkFiles) {
    if (fs.existsSync(file)) {
        let content = fs.readFileSync(file, 'utf8');
        const newContent = content.replace(/\*\*Status:\*\*\s*(.+)/, '**Status:** ✅ COMPLETE');
        if (content !== newContent) {
            fs.writeFileSync(file, newContent);
            console.log(`Updated: ${path.basename(file)}`);
        } else {
            console.log(`No change: ${path.basename(file)}`);
        }
    } else {
        console.log(`Not found: ${path.basename(file)}`);
    }
}

console.log('Status update script finished.');
