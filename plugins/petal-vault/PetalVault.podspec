require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name = 'PetalVault'
  s.version = package['version']
  s.summary = 'PetalVault iOS storage plugin'
  s.license = package['license']
  s.homepage = 'https://github.com/ariellewolter/petal'
  s.author = package['author']
  s.source = { :git => 'https://github.com/ariellewolter/petal.git', :tag => s.version.to_s }
  s.source_files = 'ios/Sources/**/*.{swift,h,m}'
  s.ios.deployment_target = '14.0'
  s.dependency 'Capacitor'
  s.swift_version = '5.1'
end
