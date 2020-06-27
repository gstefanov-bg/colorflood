resource "aws_iam_role_policy" "kaas_policy" {
  name = "kaas_policy"
  role = aws_iam_role.kaas_role.id

  policy = <<-EOF
  {
    "Version": "2012-10-17",
    "Id": "arn:aws:sqs:eu-central-1:430500215308:kaas-sqs.fifo/SQSDefaultPolicy",
    "Statement": [
      {
        "Sid": "Sid1593258701088",
        "Effect": "Allow",
        "Action": "SQS:*",
        "Resource": "arn:aws:sqs:eu-central-1:430500215308:kaas-sqs.fifo"
      }
    ]
  }
  EOF
}

resource "aws_iam_role" "kaas_role" {
  name = "kaas_role"

  assume_role_policy = <<-EOF
  {
    "Version": "2012-10-17",
    "Statement": [
      {
        "Action": "sts:AssumeRole",
        "Principal": {
          "Service": "ec2.amazonaws.com"
        },
        "Effect": "Allow",
        "Sid": ""
      }
    ]
  }
  EOF
}

resource "aws_iam_instance_profile" "kaas_profile" {
  name = "kaas_profile"
  role = aws_iam_role.kaas_role.name
}

