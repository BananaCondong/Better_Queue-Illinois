import { useOfficeHourQueue } from '../hooks/useOfficeHourQueue';
import HeaderNav from '../components/HeaderNav';
import QueueList from '../components/QueueList';

export default function StudentPage() {
  const q = useOfficeHourQueue();

  return (
    <div className="app-wrapper">
      <HeaderNav title="Better Queue" />

      <div className="container container--student">
        <div className="student-layout">
          <div className="student-layout__form">
            <div className="card student-tas-card">
              <div className="card-header">TAs available now</div>
              <div className="card-body student-tas-card__body">
                {q.availableTas.length === 0 ? (
                  <p className="student-tas-empty">
                    No TAs have checked in yet. If office hours are open, a TA may still be getting
                    set up—check back shortly.
                  </p>
                ) : (
                  <ul className="student-tas-list">
                    {q.availableTas.map((ta) => (
                      <li key={ta.id} className="student-tas-list__item">
                        {ta.name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <div className="card">
              <div className="card-header">New question</div>
              <form className="card-body" onSubmit={q.handleSubmit}>
                <div className="form-group">
                  <label>Name</label>
                  <input
                    value={q.name}
                    onChange={(e) => q.setName(e.target.value)}
                    placeholder="e.g. Delilah"
                  />
                </div>
                <div className="form-group">
                  <label>Topic</label>
                  <input
                    value={q.topic}
                    onChange={(e) => q.setTopic(e.target.value)}
                    placeholder="Briefly describe your question"
                  />
                </div>
                <div className="form-group">
                  <label>Location (Table #)</label>
                  <input
                    value={q.tableNum}
                    onChange={(e) => q.setTableNum(e.target.value)}
                    placeholder="e.g. 5"
                  />
                </div>
                <button type="submit" className="btn-add">
                  Add to queue
                </button>
              </form>
            </div>
          </div>

          <div className="student-layout__queue">
            <QueueList
              queue={q.queue}
              sensorStatus={q.sensorStatus}
              filter={q.filter}
              setFilter={q.setFilter}
              getWaitTime={q.getWaitTime}
              awayTimeoutSeconds={q.awayTimeoutSeconds}
              isTA={false}
              myQueueEntryId={q.myQueueEntryId}
              handleStartAnswering={q.handleStartAnswering}
              handleStopAnswering={q.handleStopAnswering}
              handleFinishAnswering={q.handleFinishAnswering}
              handleDelete={q.handleDelete}
              handleReview={q.handleReview}
              handleResolveReview={q.handleResolveReview}
              handleAwayTimeRequest={q.handleAwayTimeRequest}
              handleImBack={q.handleImBack}
              handleUpdateMyTopic={q.handleUpdateMyTopic}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
