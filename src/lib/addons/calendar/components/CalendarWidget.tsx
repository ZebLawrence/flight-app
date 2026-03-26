export interface CalendarWidgetProps {
  bookingUrl: string;
  title: string;
  description: string;
}

export function CalendarWidget({ bookingUrl, title, description }: CalendarWidgetProps) {
  return (
    <div className="calendar-widget">
      <h2>{title}</h2>
      <p>{description}</p>
      {bookingUrl ? (
        <iframe
          src={bookingUrl}
          title={title}
          sandbox="allow-scripts allow-same-origin allow-forms"
          style={{ width: '100%', minHeight: '400px', border: 0 }}
        />
      ) : null}
    </div>
  );
}
