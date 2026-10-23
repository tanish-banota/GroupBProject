export interface Course {
  id: string
  course_string: string | null
  subject_code: string | null
  course_number: string | null
  title: string | null
  expanded_title: string | null
  campus_code: string | null
  credits: number | string | null
  description: string | null
}

export interface Instructor {
  name?: string
}

export interface MeetingTime {
  id: string
  section_id: string
  meeting_day: string | null
  start_time_military: string | null
  end_time_military: string | null
  building_code: string | null
  room_number: string | null
  meeting_mode_description: string | null
}

export interface Section {
  id: string
  course_id: string
  registration_index: string
  section_number: string | null
  open_status: boolean | null
  open_status_text: string | null
  instructors: Instructor[]
  meeting_times: MeetingTime[]
}

export interface ScheduledSection {
  sectionId: string
  courseString: string
  courseTitle: string
  sectionNumber: string | null
  instructorNames: string
  meetingTimes: MeetingTime[]
}
