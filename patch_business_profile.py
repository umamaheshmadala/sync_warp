import re

with open('src/components/business/BusinessProfile.tsx', 'r') as f:
    content = f.read()

# 1. Extract the edit form
edit_form_match = re.search(r'(        \{\/\* Editing Form - Shown only when editing \*\/\}[\s\S]*?        \}\))', content)
edit_form = edit_form_match.group(1)

# Modify the edit form to remove the `editing && isOwner && (` wrapper
# Since it's nested inside `{activeProfileTab === 'business-info' && ( ... )}` we can just keep it or remove it.
# Actually, it's easier to just strip the first and last lines of the edit form wrapper,
# but it's simpler to just wrap it:
profile_tab_template = """  // Render profile tab (Editing and Enhanced Profile)
  const renderProfileTab = () => {
    if (!isOwner) return null;

    return (
      <div className="space-y-6">
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveProfileTab('business-info')}
              className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
                activeProfileTab === 'business-info'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Business Info
            </button>
            <button
              onClick={() => setActiveProfileTab('enhanced-profile')}
              className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
                activeProfileTab === 'enhanced-profile'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Enhanced Profile
            </button>
          </nav>
        </div>

        {activeProfileTab === 'business-info' && (
""" + edit_form.replace('{editing && isOwner && (', '')[:-2] + """
        )}

        {activeProfileTab === 'enhanced-profile' && (
          <EnhancedProfileTab
            businessId={business?.id!}
            business={business!}
            isOwner={isOwner}
            onUpdate={async () => {
              // Refresh business data from cache
              await refetchBusiness();
            }}
          />
        )}
      </div>
    );
  };
"""

# Replace the renderOverview function
overview_start = content.find('  // Render overview tab')
overview_end = content.find('  // Render statistics tab')

overview_content = content[overview_start:overview_end]

# Remove the edit form from overview
overview_content = overview_content.replace(edit_form, '')

# Remove {!editing && ( and the closing <> </> )}
overview_content = overview_content.replace('        {!editing && (\n          <>\n', '')
# The closing tags are at the very end of renderOverview
overview_content = overview_content.replace('          </>\n        )}\n      </div>\n    );\n  };\n', '      </div>\n    );\n  };\n')

# Update the setCategoriesNow button
old_button_click = """                          onClick={() => {
                            setEditing(true);
                            setTimeout(() => {
                              window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                            }, 100);
                          }}"""

new_button_click = """                          onClick={() => {
                            setSearchParams(prev => {
                              const newParams = new URLSearchParams(prev);
                              newParams.set('tab', 'profile');
                              return newParams;
                            });
                            setEditing(true);
                            setTimeout(() => {
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }, 100);
                          }}"""

overview_content = overview_content.replace(old_button_click, new_button_click)

# Insert the profile tab before overview
new_content = content[:overview_start] + profile_tab_template + "\n" + overview_content + content[overview_end:]

# Update all newParams.set('tab', 'overview'); to 'profile';
new_content = new_content.replace("newParams.set('tab', 'overview');", "newParams.set('tab', 'profile');")

# Update rendering logic at the bottom
old_render = "{activeTab === 'overview' && renderOverview()}"
new_render = "{activeTab === 'overview' && renderOverview()}\n                {activeTab === 'profile' && renderProfileTab()}"
new_content = new_content.replace(old_render, new_render)

# Remove enhanced-profile from main tabs switch
enhanced_profile_switch = """                {activeTab === 'enhanced-profile' && (
                  <EnhancedProfileTab
                    businessId={business?.id!}
                    business={business!}
                    isOwner={isOwner}
                    onUpdate={async () => {
                      // Refresh business data from cache
                      await refetchBusiness();
                    }}
                  />
                )}
"""
new_content = new_content.replace(enhanced_profile_switch, "")

with open('src/components/business/BusinessProfile.tsx', 'w') as f:
    f.write(new_content)

print("Patch applied successfully.")
