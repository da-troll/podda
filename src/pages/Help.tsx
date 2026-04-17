import { HELP_SECTIONS } from '../help/content';

export function Help() {
  return (
    <div className="page help">
      <div className="page-header">
        <h1>Help</h1>
      </div>

      <p className="help-intro">
        Quick reference for the icons and gestures you'll see around Podda.
      </p>

      {HELP_SECTIONS.map(section => (
        <section key={section.title} className="help-section">
          <h2>{section.title}</h2>
          <div className="help-card">
            {section.items.map((item, i) => (
              <div key={i} className="help-row">
                <div className="help-row-icon">{item.icon}</div>
                <div className="help-row-body">
                  <div className="help-row-label">{item.label}</div>
                  <div className="help-row-desc">{item.description}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
