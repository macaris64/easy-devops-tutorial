# @summary Render generated config under infrastructure/generated for Ansible and operators.
class easy_devops (
  String $repo_root,
  String $postgres_volume_name,
  String $mongodb_volume_name,
  String $kafka_user_events_topic,
  String $kafka_role_events_topic,
  Array[Hash[String, Data]] $kafka_topics,
) {
  $generated = "${repo_root}/infrastructure/generated"

  file { $generated:
    ensure => directory,
    mode   => '0755',
  }

  file { "${generated}/kafka-topics.yaml":
    ensure  => file,
    content => epp('easy_devops/kafka-topics.yaml.epp', { 'kafka_topics' => $kafka_topics }),
    mode    => '0644',
    require => File[$generated],
  }

  file { "${generated}/compose.env.fragment":
    ensure  => file,
    content => epp('easy_devops/compose.env.fragment.epp', {
        'postgres_volume_name'        => $postgres_volume_name,
        'mongodb_volume_name'         => $mongodb_volume_name,
        'kafka_user_events_topic'     => $kafka_user_events_topic,
        'kafka_role_events_topic'     => $kafka_role_events_topic,
        'kafka_topics'                => $kafka_topics,
    }),
    mode    => '0644',
    require => File[$generated],
  }
}
