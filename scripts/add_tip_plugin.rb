require 'xcodeproj'

proj_path = File.join(__dir__, '../mobile/ios/App/App.xcodeproj')
proj = Xcodeproj::Project.open(proj_path)

target = proj.targets.find { |t| t.name == 'App' }
abort "Target 'App' not found" unless target

app_group = proj.main_group['App']
abort "App group not found" unless app_group

# Skip if already added
if app_group.files.any? { |f| f.path == 'TipPlugin.swift' }
  puts "TipPlugin.swift already in project"
  exit 0
end

file_ref = app_group.new_file('TipPlugin.swift')
target.source_build_phase.add_file_reference(file_ref)

proj.save
puts "Added TipPlugin.swift to App target"
