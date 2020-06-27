resource "aws_sqs_queue" "kaas-sqs" {
  name                      = "kaas-sqs.fifo"
  fifo_queue                  = true
  content_based_deduplication = true
  delay_seconds             = 90
  max_message_size          = 2048
  message_retention_seconds = 86400
  receive_wait_time_seconds = 10
  visibility_timeout_seconds = 3600

  tags = {
    Environment = "kaas"
  }
}

resource "aws_sqs_queue_policy" "full-access" {
  queue_url = aws_sqs_queue.kaas-sqs.id

  policy = <<POLICY
{
  "Version": "2012-10-17",
  "Id": "arn:aws:sqs:eu-central-1:430500215308:kaas-sqs.fifo/SQSDefaultPolicy",
  "Statement": [
    {
      "Sid": "Sid1593258701088",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "SQS:*",
      "Resource": "arn:aws:sqs:eu-central-1:430500215308:kaas-sqs.fifo"
    }
  ]
}
POLICY
}
